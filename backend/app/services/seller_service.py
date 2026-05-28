"""Seller workflows for shop profile, products, order fulfillment, stats, and shop chat."""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.models.entities import Category, ChatbotConfig, Conversation, Message, Notification, Order, OrderItem, Product, ProductImage, Shop, User
from app.services.chat_events import account_events, chat_events
from app.services.email_service import send_email

logger = logging.getLogger(__name__)


def _send_email_after_commit(to_email: str, subject: str, html: str):
    """Send non-critical buyer email after order updates commit."""
    try:
        send_email(to_email, subject, html)
    except Exception:
        logger.exception("Failed to send email", extra={"to_email": to_email, "subject": subject})


def _get_owner_shop(db: Session, user: User):
    """Return the single shop owned by the seller account."""
    return db.scalar(select(Shop).where(Shop.owner_id == user.id))


def _ensure_order_owned_by_shop(db: Session, shop: Shop | None, order_id: int):
    """Guard seller order reads to orders containing at least one product from the shop."""
    if not shop:
        return
    owns = db.scalar(select(OrderItem.id).join(Product, Product.id == OrderItem.product_id).where(OrderItem.order_id == order_id, Product.shop_id == shop.id))
    if not owns:
        fail(403, "FORBIDDEN", "Không có quyền truy cập đơn hàng này")


def _ensure_order_updatable_by_shop(db: Session, shop: Shop | None, order_id: int):
    """Guard seller order status updates to orders containing shop products."""
    if not shop:
        return
    owns = db.scalar(select(OrderItem.id).join(Product, Product.id == OrderItem.product_id).where(OrderItem.order_id == order_id, Product.shop_id == shop.id))
    if not owns:
        fail(403, "FORBIDDEN", "Không có quyền cập nhật đơn hàng này")


def _ensure_shipping_updatable_by_shop(db: Session, shop: Shop | None, order_id: int):
    """Guard seller shipping updates to orders containing shop products."""
    if not shop:
        return
    owns = db.scalar(select(OrderItem.id).join(Product, Product.id == OrderItem.product_id).where(OrderItem.order_id == order_id, Product.shop_id == shop.id))
    if not owns:
        fail(403, "FORBIDDEN", "Không có quyền cập nhật vận chuyển đơn hàng này")


def update_shop(db: Session, user: User, name: str, description: str):
    """Create or update the seller's shop profile."""
    shop = _get_owner_shop(db, user)
    if not shop:
        shop = Shop(owner_id=user.id, name=name, description=description)
        db.add(shop)
    else:
        shop.name = name
        shop.description = description
    db.commit()
    return ok({"id": shop.id, "name": shop.name})


def _ensure_category_exists(db: Session, category_id: int | None):
    if category_id is not None and not db.get(Category, category_id):
        fail(400, "BAD_REQUEST", "Danh mục không tồn tại")


def create_product(db: Session, user: User, name: str, description: str, price: float, stock: int, category_id: int | None):
    """Create a product under the seller's shop."""
    shop = _get_owner_shop(db, user)
    if not shop:
        fail(400, "BAD_REQUEST", "Người bán chưa có cửa hàng")
    _ensure_category_exists(db, category_id)
    p = Product(shop_id=shop.id, category_id=category_id, name=name, description=description, price=price, stock=stock)
    db.add(p)
    db.commit()
    try:
        from app.services.ai_service import vector_store
        vector_store.add_product(p.id, p.name, p.description, p.category_id)
    except Exception as e:
        logger.warning(f"Failed to add product {p.id} to search index: {e}")
    return ok({"id": p.id})


def update_product(db: Session, user: User, product_id: int, name: str, description: str, price: float, stock: int, category_id: int | None):
    shop = _get_owner_shop(db, user)
    p = db.get(Product, product_id)
    if not p or not shop or p.shop_id != shop.id:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    _ensure_category_exists(db, category_id)
    p.name = name
    p.description = description
    p.price = price
    p.stock = stock
    p.category_id = category_id
    db.commit()
    try:
        from app.services.ai_service import vector_store
        vector_store.add_product(p.id, p.name, p.description, p.category_id)
    except Exception as e:
        logger.warning(f"Failed to update product {p.id} in search index: {e}")
    return ok({})


def delete_product(db: Session, user: User, product_id: int):
    """Soft delete a product so historical order references remain valid."""
    shop = _get_owner_shop(db, user)
    p = db.get(Product, product_id)
    if not p or not shop or p.shop_id != shop.id:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    # Soft delete per docs §6.2
    p.deleted_at = datetime.now(timezone.utc)
    db.commit()
    try:
        from app.services.ai_service import vector_store
        vector_store.delete_product(p.id)
    except Exception as e:
        logger.warning(f"Failed to delete product {p.id} from search index: {e}")


def _ensure_product_owned_by_user(db: Session, user: User, product_id: int) -> Product:
    shop = _get_owner_shop(db, user)
    product = db.get(Product, product_id)
    if not product or not shop or product.shop_id != shop.id:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    return product


def _promote_primary_image(db: Session, product_id: int):
    """Ensure a product still has one primary image after updates/deletes."""
    remaining = db.scalars(select(ProductImage).where(ProductImage.product_id == product_id).order_by(ProductImage.id.asc())).all()
    if remaining and not any(image.is_primary for image in remaining):
        remaining[0].is_primary = True



def add_product_image(db: Session, user: User, product_id: int, url: str, is_primary: bool):
    """Attach an image and maintain the single-primary-image invariant."""
    _ensure_product_owned_by_user(db, user, product_id)
    existing = db.scalars(select(ProductImage).where(ProductImage.product_id == product_id)).all()
    should_be_primary = is_primary or not existing
    if should_be_primary:
        for image in existing:
            image.is_primary = False
    image = ProductImage(product_id=product_id, url=url, is_primary=should_be_primary)
    db.add(image)
    db.commit()
    return ok({"id": image.id})


def set_product_image_primary(db: Session, user: User, image_id: int, is_primary: bool):
    image = db.get(ProductImage, image_id)
    if not image:
        fail(404, "NOT_FOUND", "Không tìm thấy ảnh")
    _ensure_product_owned_by_user(db, user, image.product_id)
    if is_primary:
        images = db.scalars(select(ProductImage).where(ProductImage.product_id == image.product_id)).all()
        for item in images:
            item.is_primary = item.id == image.id
    else:
        image.is_primary = False
        db.flush()
        _promote_primary_image(db, image.product_id)
    db.commit()
    return ok({"id": image.id, "is_primary": image.is_primary})


def delete_product_image(db: Session, user: User, image_id: int):
    image = db.get(ProductImage, image_id)
    if not image:
        fail(404, "NOT_FOUND", "Không tìm thấy ảnh")
    product_id = image.product_id
    was_primary = image.is_primary
    _ensure_product_owned_by_user(db, user, product_id)
    db.delete(image)
    db.flush()
    if was_primary:
        _promote_primary_image(db, product_id)
    db.commit()


def _serialize_order_for_seller(db: Session, order: Order, shop: Shop | None = None) -> dict:
    """Serialize only the items visible to the current seller when a shop is provided."""
    item_stmt = select(OrderItem).where(OrderItem.order_id == order.id)
    if shop:
        item_stmt = item_stmt.join(Product, Product.id == OrderItem.product_id).where(Product.shop_id == shop.id)
    items = db.scalars(item_stmt).all()
    buyer = db.get(User, order.user_id)
    shop_total = sum(float(item.price) * item.quantity for item in items)
    return {
        "id": order.id,
        "user_id": order.user_id,
        "buyer_name": buyer.full_name if buyer else None,
        "buyer_email": buyer.email if buyer else None,
        "status": order.status,
        "payment_status": order.payment_status,
        "total_price": shop_total if shop else float(order.total_price),
        "shipping_address": order.shipping_address,
        "shipping_status": order.shipping_status,
        "shipping_note": order.shipping_note,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": float(item.price),
            }
            for item in items
        ],
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


def list_orders(db: Session, user: User, page: int, page_size: int):
    shop = _get_owner_shop(db, user)
    if not shop:
        return ok({"items": [], "meta": {"page": page, "page_size": page_size, "total": 0, "total_pages": 0}})
    order_ids = db.scalars(select(Order.id).join(OrderItem, OrderItem.order_id == Order.id).join(Product, Product.id == OrderItem.product_id).where(Product.shop_id == shop.id)).all()
    unique_ids = sorted(set(order_ids), reverse=True)
    total = len(unique_ids)
    start = (page - 1) * page_size
    end = start + page_size
    page_ids = unique_ids[start:end]
    rows = []
    for oid in page_ids:
        o = db.get(Order, oid)
        if o:
            rows.append(_serialize_order_for_seller(db, o, shop))
    return ok({"items": rows, "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size if page_size else 1}})


def get_order(db: Session, user: User, order_id: int):
    shop = _get_owner_shop(db, user)
    order = db.get(Order, order_id)
    if not order:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    _ensure_order_owned_by_shop(db, shop, order.id)
    return ok(_serialize_order_for_seller(db, order, shop))


def update_order_status(db: Session, user: User, order_id: int, status: str):
    """Apply the allowed seller order status transition and notify the buyer."""
    shop = _get_owner_shop(db, user)
    order = db.get(Order, order_id)
    if not order:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    _ensure_order_updatable_by_shop(db, shop, order.id)
    allowed = {
        "pending": {"processing", "cancelled"},
        "processing": {"shipping", "cancelled"},
        "shipping": {"delivered"},
        "delivered": set(),
        "cancelled": set(),
    }
    if status not in allowed.get(order.status, set()):
        fail(400, "BAD_REQUEST", "Chuyển trạng thái đơn hàng không hợp lệ")
    order.status = status
    db.add(Notification(user_id=order.user_id, content=f"Đơn hàng #{order.id} đã chuyển sang trạng thái: {status}", type="order", channel="email"))
    db.commit()
    account_events.publish_from_thread(order.user_id, {"type": "order_updated", "order_id": order.id})
    buyer = db.get(User, order.user_id)
    if buyer:
        _send_email_after_commit(buyer.email, f"Đơn hàng #{order.id} - Cập nhật trạng thái", f"Đơn hàng <b>#{order.id}</b> đã chuyển sang: <b>{status}</b>")
    return ok({})


def update_shipping(db: Session, user: User, order_id: int, shipping_status: str, shipping_note: str):
    """Update shipping fields for an order visible to the seller's shop."""
    shop = _get_owner_shop(db, user)
    order = db.get(Order, order_id)
    if not order:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    _ensure_shipping_updatable_by_shop(db, shop, order.id)
    order.shipping_status = shipping_status
    order.shipping_note = shipping_note
    db.add(Notification(user_id=order.user_id, content=f"Vận chuyển đơn #{order.id} đã cập nhật: {shipping_status}", type="shipping", channel="system"))
    db.commit()
    account_events.publish_from_thread(order.user_id, {"type": "order_updated", "order_id": order.id})
    return ok({})


def patch_chatbot_config(db: Session, user: User, api_key: str, prompt: str, template: str, is_enabled: bool):
    shop = _get_owner_shop(db, user)
    if not shop:
        fail(404, "NOT_FOUND", "Không tìm thấy cửa hàng")
    cfg = db.scalar(select(ChatbotConfig).where(ChatbotConfig.shop_id == shop.id))
    if not cfg:
        cfg = ChatbotConfig(shop_id=shop.id, api_key=api_key, prompt=prompt, template=template, is_enabled=is_enabled)
        db.add(cfg)
    else:
        cfg.api_key = api_key
        cfg.prompt = prompt
        cfg.template = template
        cfg.is_enabled = is_enabled
    db.commit()
    return ok({})


def get_stats(db: Session, user: User, from_date: str | None = None, to_date: str | None = None):
    """Aggregate shop revenue, order count, and best-selling products."""
    shop = _get_owner_shop(db, user)
    if not shop:
        return ok({"revenue": 0, "orders": 0, "best_selling": []})

    # Find all orders that contain products from this shop.
    order_ids_q = (
        select(Order.id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(Product.shop_id == shop.id)
    )
    if from_date:
        try:
            order_ids_q = order_ids_q.where(Order.created_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            order_ids_q = order_ids_q.where(Order.created_at <= datetime.fromisoformat(to_date))
        except ValueError:
            pass

    order_ids = list(set(db.scalars(order_ids_q).all()))

    revenue = 0.0
    if order_ids:
        revenue_result = db.scalar(
            select(func.sum(OrderItem.price * OrderItem.quantity))
            .join(Product, Product.id == OrderItem.product_id)
            .where(OrderItem.order_id.in_(order_ids), Product.shop_id == shop.id)
        )
        revenue = float(revenue_result) if revenue_result else 0.0

    # Best-selling products are computed from order item quantities.
    best_selling_q = (
        select(Product.id, Product.name, func.sum(OrderItem.quantity).label("sold"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .where(Product.shop_id == shop.id)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    best_selling = [{"id": row[0], "name": row[1], "sold": int(row[2])} for row in db.execute(best_selling_q).all()]

    return ok({"revenue": revenue, "orders": len(order_ids), "best_selling": best_selling})




def _serialize_product_for_seller(db: Session, p: Product) -> dict:
    """Serialize product with full management details for seller view."""
    images = db.scalars(select(ProductImage).where(ProductImage.product_id == p.id)).all()
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "price": float(p.price),
        "stock": p.stock,
        "category_id": p.category_id,
        "attributes": p.attributes,
        "images": [{"id": img.id, "url": img.url, "is_primary": img.is_primary} for img in images],
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def get_shop(db: Session, user: User):
    shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
    if not shop:
        fail(404, "NOT_FOUND", "Không tìm thấy cửa hàng")
    return ok({
        "id": shop.id,
        "owner_id": shop.owner_id,
        "name": shop.name,
        "description": shop.description,
        "status": shop.status,
        "created_at": shop.created_at.isoformat() if shop.created_at else None,
    })


def list_products(db: Session, user: User, page: int, page_size: int):
    shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
    if not shop:
        return ok({"items": [], "meta": {"page": page, "page_size": page_size, "total": 0, "total_pages": 0}})
    items = db.scalars(select(Product).where(Product.shop_id == shop.id, Product.deleted_at.is_(None)).order_by(Product.id.desc())).all()
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]
    return ok({
        "items": [_serialize_product_for_seller(db, p) for p in page_items],
        "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size if page_size else 1},
    })


def _serialize_seller_conversation(db: Session, conversation: Conversation) -> dict:
    buyer = db.get(User, conversation.buyer_id)
    shop = db.get(Shop, conversation.shop_id) if conversation.shop_id else None
    last_message = db.scalar(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.id.desc()))
    unread = db.scalars(select(Message).where(Message.conversation_id == conversation.id, Message.is_read.is_(False), Message.sender_id != conversation.seller_id)).all()
    return {
        "id": conversation.id,
        "buyer_id": conversation.buyer_id,
        "seller_id": conversation.seller_id,
        "seller_name": shop.name if shop else "Shop",
        "shop_id": shop.id if shop else None,
        "shop_name": shop.name if shop else "Shop",
        "buyer_name": buyer.full_name if buyer else "Buyer",
        "is_bot_enabled": conversation.is_bot_enabled,
        "last_message": last_message.content if last_message else "",
        "last_message_at": last_message.created_at.isoformat() if last_message and last_message.created_at else None,
        "unread_count": len(unread),
    }


def list_chat_conversations(db: Session, user: User):
    shop = _get_owner_shop(db, user)
    if not shop:
        return ok({"items": []})
    items = db.scalars(select(Conversation).where(Conversation.shop_id == shop.id, Conversation.seller_id == user.id)).all()
    summaries = [_serialize_seller_conversation(db, item) for item in items]
    summaries.sort(key=lambda item: item["last_message_at"] or "", reverse=True)
    return ok({"items": summaries})


def _ensure_seller_conversation(db: Session, user: User, conversation_id: int) -> Conversation:
    shop = _get_owner_shop(db, user)
    conversation = db.get(Conversation, conversation_id)
    if not conversation or not shop or conversation.shop_id != shop.id or conversation.seller_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy hội thoại")
    return conversation


def list_chat_messages(db: Session, user: User, conversation_id: int):
    _ensure_seller_conversation(db, user, conversation_id)
    items = db.scalars(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.id.asc())).all()
    return ok({"items": [{"id": m.id, "conversation_id": m.conversation_id, "sender_id": m.sender_id, "content": m.content, "is_bot": m.is_bot, "is_read": m.is_read, "created_at": m.created_at.isoformat() if m.created_at else None} for m in items]})


def send_chat_message(db: Session, user: User, conversation_id: int, content: str):
    conversation = _ensure_seller_conversation(db, user, conversation_id)
    message = Message(conversation_id=conversation_id, sender_id=user.id, content=content, is_bot=False, is_read=False)
    db.add(message)
    db.commit()
    chat_events.publish_from_thread(conversation.buyer_id, {"type": "chat_message", "conversation_id": conversation.id, "message_id": message.id, "shop_id": conversation.shop_id, "sender_id": user.id})
    return ok({"id": message.id})


def read_chat_conversation(db: Session, user: User, conversation_id: int):
    conversation = _ensure_seller_conversation(db, user, conversation_id)
    items = db.scalars(select(Message).where(Message.conversation_id == conversation.id, Message.is_read.is_(False), Message.sender_id != user.id)).all()
    for message in items:
        message.is_read = True
    db.commit()
    return ok({"updated": len(items)})


def get_chatbot_config(db: Session, user: User):
    shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
    if not shop:
        fail(404, "NOT_FOUND", "Không tìm thấy cửa hàng")
    cfg = db.scalar(select(ChatbotConfig).where(ChatbotConfig.shop_id == shop.id))
    if not cfg:
        return ok({"api_key": None, "prompt": "", "template": "", "is_enabled": False})
    masked = cfg.api_key[:3] + "..." + cfg.api_key[-4:] if len(cfg.api_key) > 7 else "***"
    return ok({"api_key": masked, "prompt": cfg.prompt, "template": cfg.template, "is_enabled": cfg.is_enabled})

