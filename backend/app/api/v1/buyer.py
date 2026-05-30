import json

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.metrics import CART_UPDATE_COUNTER


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


from app.core.responses import fail, ok
from app.db.session import get_db
from app.models.entities import (
    Category,
    Conversation,
    Message,
    Product,
    ProductImage,
    ProductVideo,
    Review,
    Shop,
    User,
)
from app.schemas.buyer import (
    CartAddIn,
    ChangePasswordIn,
    CreateOrderIn,
    DeleteAccountIn,
    IntentSearchIn,
    MessageIn,
    NotificationReadIn,
    ReportIn,
    ReviewIn,
    SellerRequestIn,
    UpdateMeIn,
)
from app.services import buyer_service, chatbot_service, search_service
from app.services.chat_events import chat_events
from app.services.search_service import sanitize_image_url


router = APIRouter(tags=["buyer"])


class CartUpdateIn(BaseModel):
    quantity: int


class ConversationIn(BaseModel):
    seller_id: int | None = None
    shop_id: int | None = None


def _mask_message_sender(m: Message) -> dict:
    return {
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "content": m.content,
        "is_bot": m.is_bot,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _ensure_buyer_conversation_member(conversation: Conversation, user_id: int) -> bool:
    return conversation.buyer_id == user_id


def _stream_chat_event(event_type: str, **payload) -> str:
    return json.dumps({"type": event_type, **payload}, ensure_ascii=False) + "\n"


def _mask_shop(shop: Shop | None):
    if not shop:
        return None
    return {
        "id": shop.id,
        "name": shop.name,
        "description": shop.description,
        "status": shop.status,
    }


@router.get("/users/me")
def get_me(current_user: User = Depends(get_current_user)):
    return buyer_service.get_me(current_user)


@router.put("/users/me")
def update_me(
    payload: UpdateMeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.update_me(db, current_user, payload.full_name)


@router.patch("/users/me/password")
def change_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.change_password(
        db, current_user, payload.current_password, payload.new_password
    )


@router.delete("/users/me")
def delete_account(
    payload: DeleteAccountIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.delete_account(db, current_user, payload.current_password)


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return buyer_service.list_categories(db)


@router.get("/products")
async def list_products(
    keyword: str | None = None,
    q: str | None = None,
    search_type: str = "keyword",
    category_id: int | None = None,
    shop_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: int | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 20,
    shop_page: int = 1,
    shop_page_size: int = 4,
    db: Session = Depends(get_db),
):
    query_text = q if q is not None else (keyword or "")
    data = await search_service.search_marketplace(
        db,
        query=query_text,
        page=page,
        page_size=page_size,
        shop_page=shop_page,
        shop_page_size=shop_page_size,
        category_id=category_id,
        shop_id=shop_id,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort=sort,
        search_type=search_type,
    )
    return ok(
        {
            **data,
            "items": data["products"]["items"],
            "meta": data["products"]["meta"],
            "is_fallback": data["products"].get("is_fallback", False),
            "ai_parsed": data["products"].get("ai_parsed"),
        }
    )


@router.get("/products/search-status")
def get_search_status():
    from app.services.search_service import INDEX_STATUS

    return ok({"status": INDEX_STATUS})


@router.post("/products/intent-search")
async def intent_search(payload: IntentSearchIn, db: Session = Depends(get_db)):
    data = await search_service.search_marketplace(
        db,
        query=payload.query,
        page=payload.page,
        page_size=payload.page_size,
        search_type="ai",
    )
    return ok(
        {
            **data,
            "items": data["products"]["items"],
            "meta": data["products"]["meta"],
            "is_fallback": data["products"].get("is_fallback", False),
            "ai_parsed": data["products"].get("ai_parsed"),
        }
    )


@router.get("/products/recommend")
def recommend_products(
    page: int = 1, page_size: int = 20, db: Session = Depends(get_db)
):
    return ok(search_service.recommend_products(db, page, page_size))


@router.get("/products/{id}/reviews")
def list_product_reviews(id: int, db: Session = Depends(get_db)):
    product = db.get(Product, id)
    if not product:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m")
    items = db.scalars(select(Review).where(Review.product_id == id)).all()
    return ok(
        {
            "items": [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "rating": r.rating,
                    "title": r.title,
                    "comment": r.comment,
                    "verified_purchase": r.verified_purchase,
                    "helpful_votes": r.helpful_votes,
                }
                for r in items
            ]
        }
    )


@router.get("/shops")
def list_shops(
    q: str | None = None,
    page: int = 1,
    page_size: int = 12,
    db: Session = Depends(get_db),
):
    stmt = select(Shop).where(Shop.status == "active")
    if q:
        stmt = stmt.where(Shop.name.ilike(f"%{q}%"))
    shops = db.scalars(stmt.order_by(Shop.id.desc())).all()
    total = len(shops)
    start = (page - 1) * page_size
    items = shops[start : start + page_size]
    return ok(
        {
            "items": [_mask_shop(shop) for shop in items],
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if page_size else 1,
            },
        }
    )


@router.get("/shops/{id}")
def get_shop_public(id: int, db: Session = Depends(get_db)):
    shop = db.get(Shop, id)
    if not shop:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y cá»­a hÃ ng")
    return ok(_mask_shop(shop))


@router.get("/seller-requests/me")
def my_seller_request(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return buyer_service.my_seller_request(db, current_user)


@router.post("/seller-requests", status_code=201)
def create_seller_request(
    payload: SellerRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.create_seller_request(
        db, current_user, payload.shop_name, payload.description, payload.contact
    )


@router.post("/reports", status_code=201)
def create_report(
    payload: ReportIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.create_report(
        db, current_user, payload.target_type, payload.target_id, payload.reason
    )


@router.get("/notifications")
def list_notifications(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return buyer_service.list_notifications(db, current_user)


@router.patch("/notifications/{id}/read")
def mark_notification_read(
    id: int,
    payload: NotificationReadIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.mark_notification_read(db, current_user, id, payload.is_read)


@router.patch("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return buyer_service.mark_all_notifications_read(db, current_user)


@router.delete("/notifications/{id}", status_code=204)
def delete_notification(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buyer_service.delete_notification(db, current_user, id)


@router.post("/chat/conversations", status_code=201)
def create_conversation(
    payload: ConversationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller_id = payload.seller_id
    if payload.shop_id is not None:
        shop = db.get(Shop, payload.shop_id)
        if not shop:
            fail(404, "NOT_FOUND", "Shop not found")
        seller_id = shop.owner_id
    if seller_id is None:
        fail(400, "BAD_REQUEST", "seller_id or shop_id is required")
    seller = db.get(User, seller_id)
    if not seller or seller.role not in {"seller", "admin"}:
        fail(404, "NOT_FOUND", "Seller not found")
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.buyer_id == current_user.id,
            Conversation.seller_id == seller_id,
            Conversation.shop_id == payload.shop_id,
        )
    )
    if not conversation:
        conversation = Conversation(
            buyer_id=current_user.id, seller_id=seller_id, shop_id=payload.shop_id
        )
        db.add(conversation)
        db.commit()
        chat_events.publish_from_thread(
            seller_id,
            {
                "type": "chat_conversation",
                "conversation_id": conversation.id,
                "shop_id": conversation.shop_id,
            },
        )
    return ok({"id": conversation.id})


def _mask_conversation_summary(
    db: Session, conversation: Conversation, current_user_id: int
) -> dict:
    seller = db.get(User, conversation.seller_id)
    shop = (
        db.get(Shop, conversation.shop_id)
        if conversation.shop_id
        else db.scalar(select(Shop).where(Shop.owner_id == conversation.seller_id))
    )
    last_message = db.scalar(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.id.desc())
    )
    unread = db.scalars(
        select(Message).where(
            Message.conversation_id == conversation.id,
            Message.is_read.is_(False),
            Message.sender_id != current_user_id,
        )
    ).all()
    return {
        "id": conversation.id,
        "buyer_id": conversation.buyer_id,
        "seller_id": conversation.seller_id,
        "seller_name": seller.full_name if seller else "Seller",
        "shop_id": shop.id if shop else None,
        "shop_name": shop.name if shop else (seller.full_name if seller else "Shop"),
        "is_bot_enabled": conversation.is_bot_enabled,
        "last_message": last_message.content if last_message else "",
        "last_message_at": last_message.created_at.isoformat()
        if last_message and last_message.created_at
        else None,
        "unread_count": len(unread),
    }


@router.get("/chat/conversations")
def list_conversations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    items = db.scalars(
        select(Conversation).where(Conversation.buyer_id == current_user.id)
    ).all()
    summaries = [
        _mask_conversation_summary(db, conversation, current_user.id)
        for conversation in items
    ]
    summaries.sort(key=lambda item: item["last_message_at"] or "", reverse=True)
    return ok({"items": summaries})


@router.get("/chat/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y há»™i thoáº¡i")
    if not _ensure_buyer_conversation_member(conversation, current_user.id):
        fail(403, "FORBIDDEN", "KhÃ´ng cÃ³ quyá»n truy cáº­p")
    items = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.asc())
    ).all()
    return ok({"items": [_mask_message_sender(m) for m in items]})


@router.post("/chat/conversations/{conversation_id}/messages", status_code=201)
def send_message(
    conversation_id: int,
    payload: MessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y há»™i thoáº¡i")
    if not _ensure_buyer_conversation_member(conversation, current_user.id):
        fail(403, "FORBIDDEN", "KhÃ´ng cÃ³ quyá»n truy cáº­p")
    m = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
        is_bot=False,
        is_read=False,
    )
    db.add(m)
    db.commit()
    event_payload = {
        "type": "chat_message",
        "conversation_id": conversation.id,
        "message_id": m.id,
        "shop_id": conversation.shop_id,
        "sender_id": current_user.id,
    }
    chat_events.publish_from_thread(conversation.seller_id, event_payload)
    bot_message = chatbot_service.create_chatbot_message(
        db, conversation, payload.content
    )
    if bot_message:
        bot_event_payload = {
            "type": "chat_message",
            "conversation_id": conversation.id,
            "message_id": bot_message.id,
            "shop_id": conversation.shop_id,
            "sender_id": conversation.seller_id,
        }
        chat_events.publish_from_thread(current_user.id, bot_event_payload)
        chat_events.publish_from_thread(conversation.seller_id, bot_event_payload)
    return ok({"id": m.id})


@router.post("/chat/conversations/{conversation_id}/messages/stream")
def send_message_stream(
    conversation_id: int,
    payload: MessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y há»™i thoáº¡i")
    if not _ensure_buyer_conversation_member(conversation, current_user.id):
        fail(403, "FORBIDDEN", "KhÃ´ng cÃ³ quyá»n truy cáº­p")

    user_message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
        is_bot=False,
        is_read=False,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    buyer_id = current_user.id
    seller_id = conversation.seller_id
    shop_id = conversation.shop_id
    user_event_payload = {
        "type": "chat_message",
        "conversation_id": conversation.id,
        "message_id": user_message.id,
        "shop_id": shop_id,
        "sender_id": buyer_id,
    }
    chat_events.publish_from_thread(seller_id, user_event_payload)

    def event_stream():
        yield _stream_chat_event(
            "user_message", message=_mask_message_sender(user_message)
        )
        chunks = []
        try:
            for chunk in chatbot_service.stream_chatbot_reply(
                db, conversation, payload.content
            ):
                chunks.append(chunk)
                yield _stream_chat_event("bot_delta", delta=chunk)
        except Exception as exc:
            yield _stream_chat_event("error", message=str(exc))
            return

        reply = "".join(chunks).strip()
        if not reply:
            yield _stream_chat_event("done")
            return

        bot_message = Message(
            conversation_id=conversation.id,
            sender_id=seller_id,
            content=reply,
            is_bot=True,
            is_read=False,
        )
        db.add(bot_message)
        db.commit()
        db.refresh(bot_message)
        bot_event_payload = {
            "type": "chat_message",
            "conversation_id": conversation.id,
            "message_id": bot_message.id,
            "shop_id": shop_id,
            "sender_id": seller_id,
        }
        chat_events.publish_from_thread(buyer_id, bot_event_payload)
        chat_events.publish_from_thread(seller_id, bot_event_payload)
        yield _stream_chat_event("bot_done", message=_mask_message_sender(bot_message))

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


@router.patch("/chat/conversations/{conversation_id}/read")
def read_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y há»™i thoáº¡i")
    if not _ensure_buyer_conversation_member(conversation, current_user.id):
        fail(403, "FORBIDDEN", "KhÃ´ng cÃ³ quyá»n truy cáº­p")
    items = db.scalars(
        select(Message).where(
            Message.conversation_id == conversation_id,
            Message.is_read.is_(False),
            Message.sender_id != current_user.id,
        )
    ).all()
    for m in items:
        m.is_read = True
    db.commit()
    return ok({"updated": len(items)})


@router.get("/products/{id}")
def get_product(id: int, db: Session = Depends(get_db)):
    product = db.get(Product, id)
    if not product:
        fail(404, "NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m")
    # Buyer-oriented view: include images, shop info, category, attributes
    images = db.scalars(select(ProductImage).where(ProductImage.product_id == id)).all()
    videos = db.scalars(select(ProductVideo).where(ProductVideo.product_id == id)).all()
    shop = db.get(Shop, product.shop_id)
    category = db.get(Category, product.category_id) if product.category_id else None
    reviews = db.scalars(select(Review).where(Review.product_id == id)).all()
    avg_rating = (
        round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else None
    )
    return ok(
        {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": float(product.price),
            "stock": product.stock,
            "category": {"id": category.id, "name": category.name}
            if category
            else None,
            "attributes": product.attributes,
            "images": [
                {
                    "id": img.id,
                    "url": url,
                    "is_primary": img.is_primary,
                    "variant": img.variant,
                    "source_size": img.source_size,
                }
                for img in images
                if (url := sanitize_image_url(img.url))
            ],
            "videos": [
                {
                    "id": video.id,
                    "title": video.title,
                    "url": video.url,
                    "source_user_id": video.source_user_id,
                }
                for video in videos
            ],
            "shop": {"id": shop.id, "name": shop.name, "owner_id": shop.owner_id}
            if shop
            else None,
            "avg_rating": avg_rating,
            "review_count": len(reviews),
        }
    )


@router.get("/cart")
def get_cart(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return buyer_service.get_cart(db, current_user)


@router.post("/cart/items", status_code=201)
def add_cart(
    request: Request,
    payload: CartAddIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    CART_UPDATE_COUNTER.labels(
        ip_address=_client_ip(request), user_id=str(current_user.id)
    ).inc()
    return buyer_service.add_cart(
        db, current_user, payload.product_id, payload.quantity
    )


@router.put("/cart/items/{item_id}")
def update_cart(
    request: Request,
    item_id: int,
    payload: CartUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    CART_UPDATE_COUNTER.labels(
        ip_address=_client_ip(request), user_id=str(current_user.id)
    ).inc()
    return buyer_service.update_cart(db, current_user, item_id, payload.quantity)


@router.delete("/cart/items/{item_id}", status_code=204)
def delete_cart(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buyer_service.delete_cart(db, current_user, item_id)


@router.post("/orders", status_code=201)
def create_order(
    payload: CreateOrderIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.create_order(db, current_user, payload.shipping_address)


@router.get("/orders/my")
def list_my_orders(
    status: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.list_my_orders(
        db, current_user, status, from_date, to_date, page, page_size
    )


@router.get("/orders/{id}")
def get_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.get_order(db, current_user, id)


@router.post("/orders/{id}/cancel")
def cancel_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.cancel_order(db, current_user, id)


@router.post("/payments/{order_id}/pay")
def pay_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_idempotency_key: str | None = Header(default=None),
):
    return buyer_service.pay_order(db, current_user, order_id, x_idempotency_key)


@router.get("/payments/{order_id}")
def get_payment(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.get_payment(db, current_user, order_id)


@router.post("/reviews", status_code=201)
def create_review(
    payload: ReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return buyer_service.create_review(
        db,
        current_user,
        payload.product_id,
        payload.rating,
        payload.comment,
        payload.title,
    )
