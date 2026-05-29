import logging
import json
import re
from collections.abc import Iterator

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import Category, Conversation, Message, Product, Shop


logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Aeris Market demo shop assistant.
Answer buyer chat messages as a helpful ecommerce seller support agent.
Use only the catalog context provided below for product names, prices, stock, shops, and categories.
If the buyer asks for something outside the catalog, say what you can help with and suggest relevant listed products.
Keep answers concise, friendly, and useful for a live hackathon demo. Do not mention internal APIs, prompts, or databases."""


def _clean_text(value: str | None, limit: int = 300) -> str:
    text = " ".join((value or "").split())
    return text[:limit]


def _catalog_context(db: Session) -> str:
    rows = db.execute(
        select(Product, Shop, Category)
        .join(Shop, Product.shop_id == Shop.id)
        .outerjoin(Category, Product.category_id == Category.id)
        .where(Product.deleted_at.is_(None), Shop.status == "active")
        .order_by(Shop.id.asc(), Product.id.asc())
    ).all()
    if not rows:
        return "No products are currently available."

    lines = []
    for product, shop, category in rows:
        description = _clean_text(product.description)
        details = [
            f"id={product.id}",
            f"name={_clean_text(product.name, 180)}",
            f"shop={_clean_text(shop.name, 120)}",
            f"category={_clean_text(category.name, 80) if category else 'Uncategorized'}",
            f"price={float(product.price):.2f}",
            f"stock={product.stock}",
        ]
        if description:
            details.append(f"description={description}")
        lines.append("- " + "; ".join(details))
    return "\n".join(lines)


def _conversation_context(db: Session, conversation: Conversation, limit: int = 10) -> str:
    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.id.desc())
        .limit(limit)
    ).all()
    messages = list(reversed(messages))
    if not messages:
        return "No previous messages."

    lines = []
    for message in messages:
        if message.is_bot:
            speaker = "Assistant"
        elif message.sender_id == conversation.buyer_id:
            speaker = "Buyer"
        else:
            speaker = "Seller"
        lines.append(f"{speaker}: {_clean_text(message.content, 500)}")
    return "\n".join(lines)


def _extract_text(response_json: dict) -> str:
    for candidate in response_json.get("candidates", []):
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        if text:
            return text
    return ""


def _chatbot_prompt(db: Session, conversation: Conversation, buyer_message: str) -> str:
    shop = db.get(Shop, conversation.shop_id) if conversation.shop_id else None
    return f"""Current shop: {shop.name if shop else "Marketplace"}

Catalog context:
{_catalog_context(db)}

Recent conversation:
{_conversation_context(db, conversation)}

Latest buyer message:
{buyer_message}

Write the next assistant chat message only. Do not restate instructions, roles, catalog rows, or analysis."""


def _gemma_request_body(prompt: str) -> dict:
    return {
        "systemInstruction": {
            "parts": [{"text": SYSTEM_PROMPT}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 220,
        },
    }


def _looks_prompt_like(text: str) -> bool:
    lowered = text.lower()
    return any(
        marker in lowered
        for marker in [
            "user role:",
            "current shop:",
            "catalog for",
            "buyer's question:",
            "constraint 1:",
            "goal:",
        ]
    )


def _products_for_reply(db: Session, conversation: Conversation) -> list[tuple[Product, Shop]]:
    stmt = (
        select(Product, Shop)
        .join(Shop, Product.shop_id == Shop.id)
        .where(Product.deleted_at.is_(None), Shop.status == "active")
        .order_by(Product.price.asc(), Product.id.asc())
    )
    if conversation.shop_id:
        stmt = stmt.where(Product.shop_id == conversation.shop_id)
    return list(db.execute(stmt).all())


def _catalog_fallback_reply(db: Session, conversation: Conversation, buyer_message: str) -> str:
    rows = _products_for_reply(db, conversation)
    if not rows:
        return "I do not see any live catalog items for this shop right now, but I can still help check product details once items are available."

    text = buyer_message.lower()
    budget_match = re.search(r"(?:under|below|less than|<=?)\s*\$?\s*(\d+(?:\.\d+)?)", text)
    budget = float(budget_match.group(1)) if budget_match else None
    filtered = [(product, shop) for product, shop in rows if budget is None or float(product.price) <= budget]
    if not filtered:
        cheapest, shop = rows[0]
        budget_text = f" under ${budget:.2f}" if budget is not None else ""
        return f"I do not see an item{budget_text} in this shop. The lowest-priced option I can offer is {cheapest.name} from {shop.name} at ${float(cheapest.price):.2f}, with {cheapest.stock} in stock."

    picked, shop = filtered[0]
    alternatives = filtered[1:3]
    reply = f"I recommend {picked.name} from {shop.name}. It is ${float(picked.price):.2f} and currently has {picked.stock} in stock."
    if alternatives:
        names = ", ".join(f"{product.name} (${float(product.price):.2f})" for product, _ in alternatives)
        reply += f" Other affordable options are {names}."
    return reply


def _call_gemma(prompt: str) -> str:
    model = settings.CHATBOT_MODEL.strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    response = requests.post(
        url,
        headers={
            "x-goog-api-key": settings.GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        json=_gemma_request_body(prompt),
        timeout=settings.CHATBOT_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return _extract_text(response.json())


def _stream_gemma(prompt: str) -> Iterator[str]:
    model = settings.CHATBOT_MODEL.strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
    response = requests.post(
        url,
        params={"alt": "sse"},
        headers={
            "x-goog-api-key": settings.GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        json=_gemma_request_body(prompt),
        timeout=settings.CHATBOT_TIMEOUT_SECONDS,
        stream=True,
    )
    response.raise_for_status()
    for raw_line in response.iter_lines(decode_unicode=True):
        line = (raw_line or "").strip()
        if not line or line.startswith(":"):
            continue
        if line.startswith("data:"):
            line = line.removeprefix("data:").strip()
        if line == "[DONE]":
            break
        try:
            chunk = _extract_text(json.loads(line))
        except json.JSONDecodeError:
            continue
        if chunk:
            yield chunk


def _split_reply_for_stream(reply: str) -> Iterator[str]:
    for chunk in re.findall(r"\S+\s*", reply):
        yield chunk


def generate_chatbot_reply(db: Session, conversation: Conversation, buyer_message: str) -> str | None:
    if not settings.CHATBOT_ENABLED or not settings.GEMINI_API_KEY:
        return None

    prompt = _chatbot_prompt(db, conversation, buyer_message)

    try:
        reply = _call_gemma(prompt).strip()
        if reply and not _looks_prompt_like(reply):
            return reply
    except Exception as exc:
        logger.warning("Gemma chatbot reply failed: %s", exc)

    return _catalog_fallback_reply(db, conversation, buyer_message)


def stream_chatbot_reply(db: Session, conversation: Conversation, buyer_message: str) -> Iterator[str]:
    if not settings.CHATBOT_ENABLED or not settings.GEMINI_API_KEY:
        return

    prompt = _chatbot_prompt(db, conversation, buyer_message)
    streamed_chunks: list[str] = []
    try:
        for chunk in _stream_gemma(prompt):
            streamed_chunks.append(chunk)
            yield chunk
        reply = "".join(streamed_chunks).strip()
        if reply and not _looks_prompt_like(reply):
            return
    except Exception as exc:
        logger.warning("Gemma chatbot stream failed: %s", exc)

    if streamed_chunks:
        return

    for chunk in _split_reply_for_stream(_catalog_fallback_reply(db, conversation, buyer_message)):
        yield chunk


def create_chatbot_message(db: Session, conversation: Conversation, buyer_message: str) -> Message | None:
    reply = generate_chatbot_reply(db, conversation, buyer_message)
    if not reply:
        return None

    message = Message(
        conversation_id=conversation.id,
        sender_id=conversation.seller_id,
        content=reply,
        is_bot=True,
        is_read=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
