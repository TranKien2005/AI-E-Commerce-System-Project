from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.models.entities import ChatbotConfig, Notification, Order, OrderItem, Product, ProductImage, Shop, User
from app.services.email_service import send_email


def _get_owner_shop(db: Session, user: User):
    return db.scalar(select(Shop).where(Shop.owner_id == user.id))


def _ensure_order_owned_by_shop(db: Session, shop: Shop | None, order_id: int):
    if not shop:
        return
    owns = db.scalar(select(OrderItem.id).join(Product, Product.id == OrderItem.product_id).where(OrderItem.order_id == order_id, Product.shop_id == shop.id))
    if not owns:
        fail(403, "FORBIDDEN", "Không có quyền truy cập đơn hàng này")


def _ensure_order_updatable_by_shop(db: Session, shop: Shop | None, order_id: int):
    if not shop:
        return
    owns = db.scalar(select(OrderItem.id).join(Product, Product.id == OrderItem.product_id).where(OrderItem.order_id == order_id, Product.shop_id == shop.id))
    if not owns:
        fail(403, "FORBIDDEN", "Không có quyền cập nhật đơn hàng này")


def _ensure_shipping_updatable_by_shop(db: Session, shop: Shop | None, order_id: int):
    if not shop:
        return
    owns = db.scalar(select(OrderItem.id).join(Product, Product.id == OrderItem.product_id).where(OrderItem.order_id == order_id, Product.shop_id == shop.id))
    if not owns:
        fail(403, "FORBIDDEN", "Không có quyền cập nhật vận chuyển đơn hàng này")


def update_shop(db: Session, user: User, name: str, description: str):
    shop = _get_owner_shop(db, user)
    if not shop:
        shop = Shop(owner_id=user.id, name=name, description=description)
        db.add(shop)
    else:
        shop.name = name
        shop.description = description
    db.commit()
    return ok({"id": shop.id, "name": shop.name})


def create_product(db: Session, user: User, name: str, description: str, price: float, stock: int, category_id: int | None):
    shop = _get_owner_shop(db, user)
    if not shop:
        fail(400, "BAD_REQUEST", "Người bán chưa có cửa hàng")
    p = Product(shop_id=shop.id, category_id=category_id, name=name, description=description, price=price, stock=stock)
    db.add(p)
    db.commit()
    return ok({"id": p.id})


def update_product(db: Session, user: User, product_id: int, name: str, description: str, price: float, stock: int, category_id: int | None):
    shop = _get_owner_shop(db, user)
    p = db.get(Product, product_id)
    if not p or not shop or p.shop_id != shop.id:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    p.name = name
    p.description = description
    p.price = price
    p.stock = stock
    p.category_id = category_id
    db.commit()
    return ok({})


def delete_product(db: Session, user: User, product_id: int):
    shop = _get_owner_shop(db, user)
    p = db.get(Product, product_id)
    if not p or not shop or p.shop_id != shop.id:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    # Soft delete per docs §6.2
    p.deleted_at = datetime.now(timezone.utc)
    db.commit()


def add_product_image(db: Session, user: User, product_id: int, url: str, is_primary: bool):
    shop = _get_owner_shop(db, user)
    p = db.get(Product, product_id)
    if not p or not shop or p.shop_id != shop.id:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    image = ProductImage(product_id=product_id, url=url, is_primary=is_primary)
    db.add(image)
    db.commit()
    return ok({"id": image.id})


def delete_product_image(db: Session, image_id: int):
    image = db.get(ProductImage, image_id)
    if not image:
        fail(404, "NOT_FOUND", "Không tìm thấy ảnh")
    db.delete(image)
    db.commit()


def _serialize_order_for_seller(db: Session, order: Order) -> dict:
    """Serialize order with full management details for seller view."""
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    buyer = db.get(User, order.user_id)
    return {
        "id": order.id,
        "user_id": order.user_id,
        "buyer_name": buyer.full_name if buyer else None,
        "buyer_email": buyer.email if buyer else None,
        "status": order.status,
        "payment_status": order.payment_status,
        "total_price": float(order.total_price),
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
            rows.append(_serialize_order_for_seller(db, o))
    return ok({"items": rows, "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size if page_size else 1}})


def get_order(db: Session, user: User, order_id: int):
    shop = _get_owner_shop(db, user)
    order = db.get(Order, order_id)
    if not order:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    _ensure_order_owned_by_shop(db, shop, order.id)
    return ok(_serialize_order_for_seller(db, order))


def update_order_status(db: Session, user: User, order_id: int, status: str):
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
    # Send email to buyer
    buyer = db.get(User, order.user_id)
    if buyer:
        send_email(buyer.email, f"Đơn hàng #{order.id} - Cập nhật trạng thái", f"Đơn hàng <b>#{order.id}</b> đã chuyển sang: <b>{status}</b>")
    return ok({})


def update_shipping(db: Session, user: User, order_id: int, shipping_status: str, shipping_note: str):
    shop = _get_owner_shop(db, user)
    order = db.get(Order, order_id)
    if not order:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    _ensure_shipping_updatable_by_shop(db, shop, order.id)
    order.shipping_status = shipping_status
    order.shipping_note = shipping_note
    db.commit()
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
    shop = _get_owner_shop(db, user)
    if not shop:
        return ok({"revenue": 0, "orders": 0, "best_selling": []})

    # Find all orders that contain products from this shop
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

    # Best selling products
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


def get_chatbot_config(db: Session, user: User):
    shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
    if not shop:
        fail(404, "NOT_FOUND", "Không tìm thấy cửa hàng")
    cfg = db.scalar(select(ChatbotConfig).where(ChatbotConfig.shop_id == shop.id))
    if not cfg:
        return ok({"api_key": None, "prompt": "", "template": "", "is_enabled": False})
    masked = cfg.api_key[:3] + "..." + cfg.api_key[-4:] if len(cfg.api_key) > 7 else "***"
    return ok({"api_key": masked, "prompt": cfg.prompt, "template": cfg.template, "is_enabled": cfg.is_enabled})
