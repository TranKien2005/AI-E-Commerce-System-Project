import hashlib
import json
import logging
import math
import re
import asyncio
import unicodedata
import httpx
import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)

INDEX_STATUS = "idle"


class RedisCache:
    """Hệ thống quản lý bộ nhớ đệm Redis hỗ trợ cơ chế bất đồng bộ."""

    def __init__(self):
        """Khởi tạo kết nối đến Redis Cluster dựa trên URL cấu hình."""
        self.client = None
        try:
            self.client = redis.from_url(
                settings.REDIS_URL, 
                socket_timeout=1.0, 
                decode_responses=True
            )
            logger.info("Connected to Redis successfully for Intent-based Search cache.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. AI search caching will be bypassed.")
            self.client = None

    async def get(self, key: str) -> dict | None:
        """Truy xuất và giải mã dữ liệu JSON từ bộ nhớ cache theo khóa định danh.

        Args:
            key: Chuỗi ký tự định danh khóa cần truy xuất.

        Returns:
            Một dictionary chứa dữ liệu được giải mã nếu thành công, ngược lại 
            trả về None nếu không tìm thấy khóa hoặc mất kết nối Redis.
        """
        if not self.client:
            return None
        try:
            val = await self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Error reading from Redis cache: {e}")
        return None

    async def set(self, key: str, value: dict, ttl: int = 86400):
        """Tuần tự hóa dữ liệu thành JSON và lưu trữ vào bộ nhớ cache kèm thời gian sống.

        Args:
            key: Chuỗi ký tự định danh khóa cần lưu trữ.
            value: Cấu trúc dữ liệu dictionary cần lưu cache.
            ttl: Thời gian tồn tại của khóa trong cache (tính bằng giây).
        """
        if not self.client:
            return
        try:
            await self.client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning(f"Error writing to Redis cache: {e}")


cache = RedisCache()


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Tính toán toán học độ tương đồng Cosine giữa hai không gian vector.

    Args:
        v1: Danh sách các số thực đại diện cho vector thứ nhất.
        v2: Danh sách các số thực đại diện cho vector thứ hai.

    Returns:
        Giá trị số thực nằm trong khoảng [0.0, 1.0] thể hiện mức độ tương đồng.
    """
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    sum1 = sum(a * a for a in v1)
    sum2 = sum(b * b for b in v2)
    if sum1 == 0.0 or sum2 == 0.0:
        return 0.0
    return dot_product / (math.sqrt(sum1) * math.sqrt(sum2))


def get_mock_embedding(text: str) -> list[float]:
    """Khởi tạo một vector embedding giả lập dựa trên thuật toán băm chuỗi ký tự.

    Sử dụng làm phương án dự phòng cục bộ khi dịch vụ AI bên ngoài gặp sự cố.

    Args:
        text: Đoạn văn bản thô cần chuyển đổi thành cấu trúc vector.

    Returns:
        Một danh sách gồm 768 số thực đã được chuẩn hóa độ dài (normalized).
    """
    vector = [0.0] * 768
    words = text.lower().split()
    if not words:
        return vector
    for word in words:
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        for i in range(5):
            slot = (h + i * 17) % 768
            vector[slot] += ((h >> i) & 0xff) / 255.0
    
    norm = math.sqrt(sum(x*x for x in vector))
    if norm > 0.0:
        vector = [x / norm for x in vector]
    return vector


async def get_embedding(text: str) -> list[float]:
    """Trích xuất không gian vector embedding của văn bản từ API trực tuyến Gemini.

    Args:
        text: Chuỗi nội dung văn bản thô của sản phẩm hoặc truy vấn người dùng.

    Returns:
        Một danh sách các số thực đại diện cho phân tích ngữ nghĩa vector của văn bản.
    """
    if not text or not text.strip():
        return [0.0] * 768

    embedding_model = "gemini-embedding-2-preview"
    text_hash = hashlib.md5(text.strip().encode('utf-8')).hexdigest()
    cache_key = f"emb:{embedding_model}:{text_hash}"
    
    cached = await cache.get(cache_key)
    if cached and isinstance(cached, list):
        return cached

    if not settings.AI_SEARCH_API_KEY or settings.AI_SEARCH_MODE == "mock":
        emb = get_mock_embedding(text)
        await cache.set(cache_key, emb)
        return emb

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{embedding_model}:embedContent?key={settings.AI_SEARCH_API_KEY}"
        payload = {
            "model": f"models/{embedding_model}",
            "content": {"parts": [{"text": text}]}
        }
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                emb = data.get("embedding", {}).get("values", [])
                if emb:
                    await cache.set(cache_key, emb)
                    return emb
            logger.warning(f"Gemini embedding API returned status {resp.status_code}. Using mock embedding.")
    except Exception as e:
        logger.warning(f"Error calling Gemini embedding API: {e}. Using mock embedding.")

    emb = get_mock_embedding(text)
    await cache.set(cache_key, emb)
    return emb


class MemoryVectorStore:
    """Kho lưu trữ cơ sở dữ liệu Vector cục bộ trên RAM hỗ trợ xử lý luồng an toàn."""

    def __init__(self):
        """Khởi tạo cấu trúc lưu trữ và khóa bất đồng bộ."""
        self.lock = asyncio.Lock()
        self.storage = {}

    async def add_product(self, product_id: int, name: str, description: str, category_id: int | None):
        """Tạo vector embedding và nạp thông tin sản phẩm vào bộ nhớ không gian.

        Args:
            product_id: Khóa chính của sản phẩm trong cơ sở dữ liệu quan hệ.
            name: Tên sản phẩm.
            description: Nội dung mô tả chi tiết sản phẩm.
            category_id: ID danh mục trực thuộc.
        """
        text = f"{name or ''} {description or ''}".strip()
        emb = await get_embedding(text)
        async with self.lock:
            self.storage[product_id] = {
                "name": name,
                "description": description,
                "category_id": category_id,
                "embedding": emb
            }

    async def delete_product(self, product_id: int):
        """Xóa bỏ sản phẩm và cấu trúc dữ liệu vector liên quan ra khỏi bộ nhớ.

        Args:
            product_id: ID của sản phẩm cần loại bỏ.
        """
        async with self.lock:
            if product_id in self.storage:
                del self.storage[product_id]

    async def query_similarity(self, query_text: str, k: int = 20) -> list[int]:
        """Tìm kiếm Top-K sản phẩm có độ tương đồng ngữ nghĩa cao nhất với từ khóa.

        Args:
            query_text: Đoạn văn bản tìm kiếm đầu vào của khách hàng.
            k: Số lượng kết quả tối đa được phép trả về.

        Returns:
            Danh sách các ID sản phẩm được xếp theo thứ tự độ tương đồng giảm dần.
        """
        if not self.storage:
            return []
        query_emb = await get_embedding(query_text)
        scores = []
        async with self.lock:
            for pid, pdata in self.storage.items():
                sim = cosine_similarity(query_emb, pdata["embedding"])
                scores.append((pid, sim))
        scores.sort(key=lambda x: x[1], reverse=True)
        return [pid for pid, score in scores[:k]]


vector_store = MemoryVectorStore()


def mock_parse_intent(query_text: str, categories: list[str]) -> dict:
    """Phân tách từ khóa bằng biểu thức chính quy (Regex) khi không dùng mô hình AI.

    Args:
        query_text: Nội dung văn bản tìm kiếm gốc từ phía client.
        categories: Danh sách tên tất cả các danh mục sản phẩm hiện hành.

    Returns:
        Một cấu trúc dictionary chứa các tham số bộ lọc đã bóc tách được.
    """
    query_lower = query_text.lower()
    
    def norm_price(match):
        millions_val = float(match.group(1).replace(",", "."))
        frac_str = match.group(2)
        if not frac_str:
            return f"{int(millions_val * 1_000_000)} đ"
        frac = int(frac_str)
        if len(frac_str) == 1:
            val = millions_val * 1_000_000 + frac * 100_000
        elif len(frac_str) == 2:
            val = millions_val * 1_000_000 + frac * 10_000
        else:
            val = millions_val * 1_000_000 + frac * 1_000
        return f"{int(val)} đ"

    query_lower = re.sub(
        r'(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\s*(\d+)?\s*(k|đ|vnd)?',
        norm_price,
        query_lower
    )

    query_plain = unicodedata.normalize("NFKD", query_lower).encode("ascii", "ignore").decode("ascii")
    
    matched_category = None
    for cat in categories:
        if cat.lower() in query_lower:
            matched_category = cat
            break

    min_price, max_price = None, None
    under_match, over_match, range_match = None, None, None

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

    range_match = re.search(
        r'(?:giá\s+)?từ\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|đ|usd)?\s*(?:đến|tới|-)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|đ|usd)?',
        query_lower
    )
    if range_match:
        val1 = parse_number(range_match.group(1), range_match.group(2) or range_match.group(4))
        val2 = parse_number(range_match.group(3), range_match.group(4) or range_match.group(2))
        if val1 is not None: min_price = val1
        if val2 is not None: max_price = val2
    else:
        under_match = re.search(
            r'(?:giá\s+)?(?:dưới|tối\s+đa|nhỏ\s+hơn|ít\s+hơn)\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|đ|usd)?',
            query_lower
        )
        if under_match:
            val = parse_number(under_match.group(1), under_match.group(2))
            if val is not None: max_price = val
        
        over_match = re.search(
            r'(?:giá\s+)?(?:trên|hơn|tối\s+thiểu|lớn\s+hơn|nhiều\s+hơn)\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|đ|usd)?',
            query_lower
        )
        if over_match:
            val = parse_number(over_match.group(1), over_match.group(2))
            if val is not None: min_price = val

    sort = None
    if any(k in query_lower for k in ["rẻ nhất", "thấp nhất", "giá tăng", "thấp đến cao"]):
        sort = "price_asc"
    elif any(k in query_lower for k in ["đắt nhất", "cao nhất", "giá giảm", "cao xuống thấp"]):
        sort = "price_desc"
    elif any(k in query_lower for k in ["phổ biến", "bán chạy", "hot"]):
        sort = "popular"
    elif any(k in query_lower for k in ["mới nhất", "mới về"]):
        sort = "newest"

    clean_query = query_lower
    if range_match: clean_query = clean_query.replace(range_match.group(0), "")
    if under_match: clean_query = clean_query.replace(under_match.group(0), "")
    if over_match:  clean_query = clean_query.replace(over_match.group(0), "")
    
    keywords_remove = ["rẻ nhất", "thấp nhất", "giá tăng", "thấp đến cao", "đắt nhất", "cao nhất", "giá giảm", "cao xuống thấp", "phổ biến", "bán chạy", "hot", "mới nhất", "mới về"]
    for kw in keywords_remove:
        clean_query = re.sub(rf'\b{kw}\b', '', clean_query, flags=re.IGNORECASE)
        
    if matched_category:
        clean_query = re.sub(rf'\b{matched_category}\b', '', clean_query, flags=re.IGNORECASE)

    clean_query = re.sub(r'\s+', ' ', clean_query).strip() or query_text

    return {
        "category": matched_category,
        "min_price": min_price,
        "max_price": max_price,
        "sort": sort,
        "search_query": clean_query,
        "is_fallback": True
    }


async def parse_intent(query_text: str, categories: list[str]) -> dict:
    """Sử dụng mô hình ngôn ngữ lớn LLM để bóc tách ý định lọc dữ liệu của người dùng.

    Thực hiện gọi API bất đồng bộ kết hợp cơ chế thử lại (fallback) liên tiếp giữa 
    các phiên bản mô hình khác nhau nhằm tăng tính sẵn sàng của dịch vụ.

    Args:
        query_text: Đoạn văn bản ngôn ngữ tự nhiên do khách hàng nhập trên ô tìm kiếm.
        categories: Bộ nhãn tên danh mục sản phẩm lấy ra từ hệ thống DB.

    Returns:
        Một cấu trúc dữ liệu chuẩn hóa dạng Dict chứa các trường thông tin: 
        category, min_price, max_price, sort, search_query và trạng thái fallback.
    """
    if not query_text or not query_text.strip():
        return {"category": None, "min_price": None, "max_price": None, "sort": None, "search_query": "", "is_fallback": True}

    cats_str = ",".join(sorted(categories))
    query_hash = hashlib.md5(f"intent:{query_text}:{cats_str}".encode('utf-8')).hexdigest()
    
    cached = await cache.get(query_hash)
    if cached:
        return cached

    if not settings.AI_SEARCH_API_KEY or settings.AI_SEARCH_MODE == "mock":
        res = mock_parse_intent(query_text, categories)
        await cache.set(query_hash, res)
        return res

    try:
        prompt = (
            f"You are an AI assistant in an E-Commerce system. Your task is to parse a user search query into structured search filters.\n"
            f"Available categories: {categories}\n\n"
            f"Given the user query: \"{query_text}\"\n\n"
            f"Extract parameters as JSON format with keys: category (string or null), min_price (number or null), max_price (number or null), sort (string or null), search_query (string)."
        )
        payload = {"contents": [{ "parts": [{"text": prompt}]}]}
        
        models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"]
        for model in models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.AI_SEARCH_API_KEY}"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_response = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text_response:
                            parsed = json.loads(text_response.strip())
                            
                            result = {
                                "category": parsed.get("category"),
                                "min_price": parsed.get("min_price"),
                                "max_price": parsed.get("max_price"),
                                "sort": parsed.get("sort"),
                                "search_query": parsed.get("search_query") or query_text,
                                "is_fallback": False
                            }
                            await cache.set(query_hash, result)
                            return result
            except Exception as model_exc:
                logger.warning(f"Error calling {model}: {model_exc}. Trying next fallback model.")

    except Exception as e:
        logger.warning(f"Error calling Gemini intent API: {e}. Using mock parsing.")

    res = mock_parse_intent(query_text, categories)
    await cache.set(query_hash, res)
    return res
