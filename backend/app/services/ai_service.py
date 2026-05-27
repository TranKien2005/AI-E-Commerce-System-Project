import hashlib
import json
import logging
import math
import re
import threading
import unicodedata
import httpx
import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis Cache Client
class RedisCache:
    def __init__(self):
        self.client = None
        try:
            self.client = redis.from_url(settings.REDIS_URL, socket_timeout=1.0)
            self.client.ping()
            logger.info("Connected to Redis successfully for Intent-based Search cache.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. AI search caching will be bypassed.")
            self.client = None

    def get(self, key: str) -> dict | None:
        if not self.client:
            return None
        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Error reading from Redis cache: {e}")
        return None

    def set(self, key: str, value: dict, ttl: int = 86400):
        if not self.client:
            return
        try:
            self.client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning(f"Error writing to Redis cache: {e}")

# Global Cache Instance
cache = RedisCache()

# Core Math functions for Cosine Similarity
def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    sum1 = sum(a * a for a in v1)
    sum2 = sum(b * b for b in v2)
    if sum1 == 0.0 or sum2 == 0.0:
        return 0.0
    return dot_product / (math.sqrt(sum1) * math.sqrt(sum2))

# Mock Embedding generator
def get_mock_embedding(text: str) -> list[float]:
    vector = [0.0] * 768
    words = text.lower().split()
    if not words:
        return vector
    for word in words:
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        # populate vector slots based on hash
        for i in range(5):
            slot = (h + i * 17) % 768
            vector[slot] += ((h >> i) & 0xff) / 255.0
    # normalize
    norm = math.sqrt(sum(x*x for x in vector))
    if norm > 0.0:
        vector = [x / norm for x in vector]
    return vector

# Live Gemini Embedding generator
def get_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        return [0.0] * 768

    embedding_model = "gemini-embedding-2-preview"
    text_hash = hashlib.md5(text.strip().encode('utf-8')).hexdigest()
    cache_key = f"emb:{embedding_model}:{text_hash}"
    cached = cache.get(cache_key)
    if cached and isinstance(cached, list):
        return cached

    if not settings.AI_SEARCH_API_KEY or settings.AI_SEARCH_MODE == "mock":
        emb = get_mock_embedding(text)
        cache.set(cache_key, emb)
        return emb

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{embedding_model}:embedContent?key={settings.AI_SEARCH_API_KEY}"
        payload = {
            "model": f"models/{embedding_model}",
            "content": {
                "parts": [{"text": text}]
            }
        }
        with httpx.Client(timeout=2.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                emb = data.get("embedding", {}).get("values", [])
                if emb:
                    cache.set(cache_key, emb)
                    return emb
            logger.warning(f"Gemini embedding API returned status {resp.status_code}: {resp.text}. Using mock embedding.")
    except Exception as e:
        logger.warning(f"Error calling Gemini embedding API: {e}. Using mock embedding.")

    emb = get_mock_embedding(text)
    cache.set(cache_key, emb)
    return emb

# Vector Store interface
class BaseVectorStore:
    def add_product(self, product_id: int, name: str, description: str, category_id: int | None):
        raise NotImplementedError

    def delete_product(self, product_id: int):
        raise NotImplementedError

    def query_similarity(self, query_text: str, k: int = 20) -> list[int]:
        raise NotImplementedError

class MemoryVectorStore(BaseVectorStore):
    def __init__(self):
        self.lock = threading.Lock()
        self.storage = {}  # product_id -> {"name", "description", "category_id", "embedding"}

    def add_product(self, product_id: int, name: str, description: str, category_id: int | None):
        text = f"{name or ''} {description or ''}".strip()
        emb = get_embedding(text)
        with self.lock:
            self.storage[product_id] = {
                "name": name,
                "description": description,
                "category_id": category_id,
                "embedding": emb
            }

    def delete_product(self, product_id: int):
        with self.lock:
            if product_id in self.storage:
                del self.storage[product_id]

    def query_similarity(self, query_text: str, k: int = 20) -> list[int]:
        if not self.storage:
            return []
        query_emb = get_embedding(query_text)
        scores = []
        with self.lock:
            for pid, pdata in self.storage.items():
                sim = cosine_similarity(query_emb, pdata["embedding"])
                scores.append((pid, sim))
        scores.sort(key=lambda x: x[1], reverse=True)
        return [pid for pid, score in scores[:k]]

# Instantiate Vector Store
vector_store = MemoryVectorStore()

# Mock Intent Parser
def mock_parse_intent(query_text: str, categories: list[str]) -> dict:
    query_lower = query_text.lower()
    query_plain = unicodedata.normalize("NFKD", query_lower).encode("ascii", "ignore").decode("ascii")
    
    # 1. Category extraction (substring case-insensitive match)
    matched_category = None
    for cat in categories:
        if cat.lower() in query_lower:
            matched_category = cat
            break

    # 2. Price extraction
    min_price = None
    max_price = None
    under_match = None
    over_match = None
    
    def parse_number(num_str, unit):
        try:
            val = float(num_str.replace(",", "."))
            unit_text = (unit or "").lower()
            unit_text = unicodedata.normalize("NFKD", unit_text).encode("ascii", "ignore").decode("ascii")
            if unit_text in ["trieu", "tr", "million", "m"]:
                return val * 1_000_000
            elif unit_text in ["k", "nghin", "ngan"]:
                return val * 1_000
            return val
        except ValueError:
            return None

    # Pattern "tá»« A Ä‘áº¿n B" or "tá»« A - B"
    range_match = re.search(
        r'(?:giÃ¡\s+)?tá»«\s+(\d+(?:[.,]\d+)?)\s*(triá»‡u|tr|k|Ä‘|usd)?\s*(?:Ä‘áº¿n|tá»›i|-)\s*(\d+(?:[.,]\d+)?)\s*(triá»‡u|tr|k|Ä‘|usd)?',
        query_lower
    )
    if range_match:
        val1 = parse_number(range_match.group(1), range_match.group(2) or range_match.group(4))
        val2 = parse_number(range_match.group(3), range_match.group(4) or range_match.group(2))
        if val1 is not None:
            min_price = val1
        if val2 is not None:
            max_price = val2
    else:
        # Pattern "dÆ°á»›i B" or "tá»‘i Ä‘a B"
        under_match = re.search(
            r'(?:giÃ¡\s+)?(?:dÆ°á»›i|tá»‘i\s+Ä‘a|nhá»\s+hÆ¡n|Ã­t\s+hÆ¡n)\s+(\d+(?:[.,]\d+)?)\s*(triá»‡u|tr|k|Ä‘|usd)?',
            query_lower
        )
        if under_match:
            val = parse_number(under_match.group(1), under_match.group(2))
            if val is not None:
                max_price = val
        
        # Pattern "trÃªn A" or "tá»‘i thiá»ƒu A"
        over_match = re.search(
            r'(?:giÃ¡\s+)?(?:trÃªn|hÆ¡n|tá»‘i\s+thiá»ƒu|lá»›n\s+hÆ¡n|nhiá»u\s+hÆ¡n)\s+(\d+(?:[.,]\d+)?)\s*(triá»‡u|tr|k|Ä‘|usd)?',
            query_lower
        )
        if over_match:
            val = parse_number(over_match.group(1), over_match.group(2))
            if val is not None:
                min_price = val

    # 3. Sort extraction
    sort = None
    if any(k in query_lower for k in ["ráº» nháº¥t", "tháº¥p nháº¥t", "giÃ¡ tÄƒng", "tháº¥p Ä‘áº¿n cao"]):
        sort = "price_asc"
    elif any(k in query_lower for k in ["Ä‘áº¯t nháº¥t", "cao nháº¥t", "giÃ¡ giáº£m", "cao xuá»‘ng tháº¥p"]):
        sort = "price_desc"
    elif any(k in query_lower for k in ["phá»• biáº¿n", "bÃ¡n cháº¡y", "hot"]):
        sort = "popular"
    elif any(k in query_lower for k in ["má»›i nháº¥t", "má»›i vá»"]):
        sort = "newest"

    # 4. Clean search query
    clean_query = query_text
    # Remove matched price phrases
    if range_match:
        clean_query = clean_query.replace(range_match.group(0), "")
    if under_match:
        clean_query = clean_query.replace(under_match.group(0), "")
    if over_match:
        clean_query = clean_query.replace(over_match.group(0), "")
    
    # Remove sorting keywords
    for kw in ["ráº» nháº¥t", "tháº¥p nháº¥t", "giÃ¡ tÄƒng", "tháº¥p Ä‘áº¿n cao", "Ä‘áº¯t nháº¥t", "cao nháº¥t", "giÃ¡ giáº£m", "cao xuá»‘ng tháº¥p", "phá»• biáº¿n", "bÃ¡n cháº¡y", "hot", "má»›i nháº¥t", "má»›i vá»"]:
        clean_query = re.sub(rf'\b{kw}\b', '', clean_query, flags=re.IGNORECASE)
        
    # Remove category name to make search query clean for keywords
    if matched_category:
        clean_query = re.sub(rf'\b{matched_category}\b', '', clean_query, flags=re.IGNORECASE)

    # Clean whitespace
    clean_query = re.sub(r'\s+', ' ', clean_query).strip()
    if not clean_query:
        clean_query = query_text

    plain_clean_query = clean_query
    if max_price is None:
        match = re.search(r'(?:duoi|toi\s+da|nho\s+hon|it\s+hon|under|less\s+than)\s+(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|usd)?', query_plain)
        if match:
            max_price = parse_number(match.group(1), match.group(2))
            plain_clean_query = re.sub(match.group(0), '', plain_clean_query, flags=re.IGNORECASE)
    if min_price is None:
        match = re.search(r'(?:tren|hon|toi\s+thieu|lon\s+hon|nhieu\s+hon|over|more\s+than|above)\s+(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|usd)?', query_plain)
        if match:
            min_price = parse_number(match.group(1), match.group(2))
            plain_clean_query = re.sub(match.group(0), '', plain_clean_query, flags=re.IGNORECASE)
    if sort is None:
        if any(k in query_plain for k in ["re nhat", "thap nhat", "gia tang", "thap den cao", "cheapest", "lowest"]):
            sort = "price_asc"
        elif any(k in query_plain for k in ["dat nhat", "cao nhat", "gia giam", "cao xuong thap", "expensive", "highest"]):
            sort = "price_desc"
        elif any(k in query_plain for k in ["pho bien", "ban chay", "hot", "popular", "best seller"]):
            sort = "popular"
        elif any(k in query_plain for k in ["moi nhat", "moi ve", "newest", "latest"]):
            sort = "newest"
    for keyword in ["re nhat", "thap nhat", "gia tang", "thap den cao", "dat nhat", "cao nhat", "gia giam", "cao xuong thap", "pho bien", "ban chay", "moi nhat", "moi ve", "cheapest", "lowest", "expensive", "highest", "popular", "best seller", "newest", "latest"]:
        plain_clean_query = re.sub(rf'\b{keyword}\b', '', plain_clean_query, flags=re.IGNORECASE)
    clean_query = re.sub(r'\s+', ' ', plain_clean_query).strip() or query_text

    return {
        "category": matched_category,
        "min_price": min_price,
        "max_price": max_price,
        "sort": sort,
        "search_query": clean_query,
        "is_fallback": True
    }

# Live Gemini Intent Parser
def parse_intent(query_text: str, categories: list[str]) -> dict:
    if not query_text or not query_text.strip():
        return {
            "category": None,
            "min_price": None,
            "max_price": None,
            "sort": None,
            "search_query": "",
            "is_fallback": True
        }

    # Caching key: md5 of query and sorted categories
    cats_str = ",".join(sorted(categories))
    query_hash = hashlib.md5(f"intent:{query_text}:{cats_str}".encode('utf-8')).hexdigest()
    cached = cache.get(query_hash)
    if cached:
        return cached

    # Fallback if no API key or mock mode
    if not settings.AI_SEARCH_API_KEY or settings.AI_SEARCH_MODE == "mock":
        res = mock_parse_intent(query_text, categories)
        cache.set(query_hash, res)
        return res

    try:
        prompt = (
            f"You are an AI assistant in an E-Commerce system. Your task is to parse a user search query into structured search filters.\n"
            f"Available categories: {categories}\n\n"
            f"Given the user query: \"{query_text}\"\n\n"
            f"Extract the following:\n"
            f"1. \"category\": the name of the category from the available list that matches the user's intent. If none matches or is specified, return null. Note: perform semantic matching (e.g. \"mÃ¡y tÃ­nh\" matches \"Laptop\").\n"
            f"2. \"min_price\": the minimum price specified by the user as float/integer (e.g. \"10 triá»‡u\" is 10000000). If not specified, return null.\n"
            f"3. \"max_price\": the maximum price specified by the user as float/integer. If not specified, return null.\n"
            f"4. \"sort\": sort criteria. Choose exactly from: \"price_asc\", \"price_desc\", \"popular\", \"newest\", or null.\n"
            f"5. \"search_query\": a cleaned search query string with price ranges, category names and sorting instructions removed. Keep only descriptive words (e.g., \"laptop dell core i5 giÃ¡ ráº» nháº¥t\" -> search_query should be \"dell core i5\").\n\n"
            f"You must return a valid JSON object only. Do not add markdown backticks. The schema must be:\n"
            f"{{\n"
            f"  \"category\": string or null,\n"
            f"  \"min_price\": number or null,\n"
            f"  \"max_price\": number or null,\n"
            f"  \"sort\": string or null,\n"
            f"  \"search_query\": string\n"
            f"}}"
        )
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        # Model fallback chain: gemini-3.5-flash -> gemini-3.1-flash-lite
        models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"]
        for model in models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.AI_SEARCH_API_KEY}"
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_response = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text_response:
                            parsed = json.loads(text_response.strip())
                            category = parsed.get("category")
                            if category and category not in categories:
                                matched = None
                                for cat in categories:
                                    if cat.lower() == category.lower():
                                        matched = cat
                                        break
                                category = matched
                            
                            result = {
                                "category": category,
                                "min_price": parsed.get("min_price"),
                                "max_price": parsed.get("max_price"),
                                "sort": parsed.get("sort"),
                                "search_query": parsed.get("search_query") or query_text,
                                "is_fallback": False
                            }
                            cache.set(query_hash, result)
                            logger.info(f"Successfully parsed intent using {model}.")
                            return result
                    logger.warning(f"Gemini model {model} returned code {resp.status_code}: {resp.text}. Trying next.")
            except Exception as model_exc:
                logger.warning(f"Error calling {model}: {model_exc}. Trying next.")

    except Exception as e:
        logger.warning(f"Error calling Gemini intent API: {e}. Using mock parsing.")

    # Fallback to mock if API fails
    res = mock_parse_intent(query_text, categories)
    cache.set(query_hash, res)
    return res

