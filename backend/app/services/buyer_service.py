import random
from datetime import datetime
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.models.entities import CartItem, Category, Conversation, Message, Notification, Order, OrderItem, Payment, Product, ProductImage, Report, Review, SellerRequest, Shop, User
from app.services.email_service import send_email


def get_me(user: User):
    return ok({"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "status": user.status})


def update_me(db: Session, user: User, full_name: str):
    user.full_name = full_name
    db.commit()
    return ok({"id": user.id, "full_name": user.full_name})


def add_cart(db: Session, user: User, product_id: int, quantity: int):
    product = db.get(Product, product_id)
    if not product or product.deleted_at is not None:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    if quantity < 1:
        fail(422, "VALIDATION_ERROR", "Số lượng phải lớn hơn 0")
    if product.stock < quantity:
        fail(400, "BAD_REQUEST", "Sản phẩm không đủ số lượng tồn kho")
    existing = db.scalar(select(CartItem).where(and_(CartItem.user_id == user.id, CartItem.product_id == product_id)))
    if existing:
        if product.stock < existing.quantity + quantity:
            fail(400, "BAD_REQUEST", "Sản phẩm không đủ số lượng tồn kho")
        existing.quantity += quantity
    else:
        db.add(CartItem(user_id=user.id, product_id=product_id, quantity=quantity))
    db.commit()
    return ok({})


def create_order(db: Session, user: User, shipping_address: str):
    cart_items = db.scalars(select(CartItem).where(CartItem.user_id == user.id)).all()
    if not cart_items:
        fail(400, "BAD_REQUEST", "Giỏ hàng trống")

    # Validate stock for all items first
    for c in cart_items:
        p = db.get(Product, c.product_id)
        if not p or p.deleted_at is not None:
            fail(400, "BAD_REQUEST", f"Sản phẩm #{c.product_id} không còn tồn tại")
        if p.stock < c.quantity:
            fail(400, "BAD_REQUEST", f"Sản phẩm '{p.name}' không đủ tồn kho (còn {p.stock}, cần {c.quantity})")

    total = 0.0
    order = Order(user_id=user.id, total_price=0, shipping_address=shipping_address)
    db.add(order)
    db.flush()
    for c in cart_items:
        p = db.get(Product, c.product_id)
        if not p:
            continue
        total += float(p.price) * c.quantity
        db.add(OrderItem(order_id=order.id, product_id=p.id, quantity=c.quantity, price=p.price))
        # Deduct stock
        p.stock -= c.quantity
        db.delete(c)
    order.total_price = total
    db.add(Notification(user_id=user.id, content=f"Đơn hàng #{order.id} đã được tạo thành công", type="order", channel="email"))
    db.commit()
    send_email(user.email, f"Đơn hàng #{order.id} đã được tạo", f"Đơn hàng <b>#{order.id}</b> đã được tạo thành công. Tổng: {total:,.0f}đ")
    return ok({"order_id": order.id})


def pay_order(db: Session, user: User, order_id: int, x_idempotency_key: str | None):
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    if order.payment_status == "success":
        fail(400, "BAD_REQUEST", "Đơn hàng đã được thanh toán")
    if x_idempotency_key:
        existing = db.scalar(select(Payment).where(Payment.order_id == order_id, Payment.idempotency_key == x_idempotency_key))
        if existing:
            return ok({"payment_id": existing.id, "status": existing.status})

    # FAKE: random success/failed as per docs §6.4.8
    result_status = random.choice(["success", "success", "success", "failed"])  # 75% success
    payment = Payment(
        order_id=order_id,
        method="ONLINE",
        status=result_status,
        transaction_id=f"txn_{uuid4().hex[:12]}",
        idempotency_key=x_idempotency_key,
    )
    db.add(payment)
    if result_status == "success":
        order.payment_status = "success"
        db.add(Notification(user_id=user.id, content=f"Thanh toán đơn #{order_id} thành công", type="payment", channel="email"))
    else:
        order.payment_status = "failed"
        db.add(Notification(user_id=user.id, content=f"Thanh toán đơn #{order_id} thất bại, vui lòng thử lại", type="payment", channel="email"))
    db.commit()
    if result_status == "success":
        send_email(user.email, f"Thanh toán đơn #{order_id} thành công", f"Đơn hàng <b>#{order_id}</b> đã được thanh toán thành công.")
    else:
        send_email(user.email, f"Thanh toán đơn #{order_id} thất bại", f"Thanh toán đơn hàng <b>#{order_id}</b> thất bại. Vui lòng thử lại.")
    return ok({"payment_id": payment.id, "status": payment.status})


def create_review(db: Session, user: User, product_id: int, rating: int, comment: str):
    product = db.get(Product, product_id)
    if not product:
        fail(404, "NOT_FOUND", "Không tìm thấy sản phẩm")
    if rating < 1 or rating > 5:
        fail(422, "VALIDATION_ERROR", "Rating phải từ 1 đến 5")
    orders = db.scalars(select(Order).where(Order.user_id == user.id, Order.status == "delivered")).all()
    order_ids = [o.id for o in orders]
    if not order_ids:
        fail(403, "FORBIDDEN", "Chỉ được đánh giá sản phẩm đã mua trong đơn delivered")
    item = db.scalar(select(OrderItem).where(OrderItem.order_id.in_(order_ids), OrderItem.product_id == product_id))
    if not item:
        fail(403, "FORBIDDEN", "Chỉ được đánh giá sản phẩm đã mua trong đơn delivered")
    review = Review(user_id=user.id, product_id=product_id, rating=rating, comment=comment)
    db.add(review)
    db.commit()
    return ok({"id": review.id})


def list_categories(db: Session):
    items = db.scalars(select(Category)).all()
    return ok({"items": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in items]})


def get_cart(db: Session, user: User):
    items = db.scalars(select(CartItem).where(CartItem.user_id == user.id)).all()
    data = []
    for item in items:
        p = db.get(Product, item.product_id)
        primary_img = db.scalar(
            select(ProductImage).where(ProductImage.product_id == item.product_id, ProductImage.is_primary.is_(True))
        ) if p else None
        if not primary_img and p:
            primary_img = db.scalar(select(ProductImage).where(ProductImage.product_id == item.product_id))
        data.append({
            "item_id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "name": p.name if p else None,
            "price": float(p.price) if p else None,
            "primary_image": primary_img.url if primary_img else None,
            "stock": p.stock if p else 0,
        })
    return ok({"items": data})


def list_my_orders(db: Session, user: User, status: str | None = None,
                   from_date: str | None = None, to_date: str | None = None,
                   page: int = 1, page_size: int = 20):
    stmt = select(Order).where(Order.user_id == user.id)
    if status:
        stmt = stmt.where(Order.status == status)
    if from_date:
        try:
            stmt = stmt.where(Order.created_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            stmt = stmt.where(Order.created_at <= datetime.fromisoformat(to_date))
        except ValueError:
            pass
    stmt = stmt.order_by(Order.id.desc())
    orders = db.scalars(stmt).all()
    total = len(orders)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = orders[start:end]
    return ok({
        "items": [
            {
                "id": o.id,
                "status": o.status,
                "payment_status": o.payment_status,
                "total_price": float(o.total_price),
                "shipping_status": o.shipping_status,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in page_items
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if page_size else 1,
        },
    })


def get_order(db: Session, user: User, order_id: int):
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    return ok({
        "id": order.id,
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
    })


def cancel_order(db: Session, user: User, order_id: int):
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    if order.status not in {"pending", "processing"}:
        fail(400, "BAD_REQUEST", "Không thể hủy đơn ở trạng thái hiện tại")
    order.status = "cancelled"
    # Restore stock
    order_items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    for oi in order_items:
        p = db.get(Product, oi.product_id)
        if p:
            p.stock += oi.quantity
    db.add(Notification(user_id=user.id, content=f"Đơn hàng #{order_id} đã được hủy", type="order", channel="email"))
    db.commit()
    send_email(user.email, f"Đơn hàng #{order_id} đã hủy", f"Đơn hàng <b>#{order_id}</b> đã được hủy thành công.")
    return ok({})


def get_payment(db: Session, user: User, order_id: int):
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy đơn hàng")
    payment = db.scalar(select(Payment).where(Payment.order_id == order_id).order_by(Payment.id.desc()))
    if not payment:
        fail(404, "NOT_FOUND", "Không tìm thấy thanh toán")
    return ok({
        "order_id": order_id,
        "method": payment.method,
        "status": payment.status,
        "transaction_id": payment.transaction_id,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    })


def update_cart(db: Session, user: User, item_id: int, quantity: int):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy item")
    if quantity < 1:
        fail(422, "VALIDATION_ERROR", "Số lượng phải lớn hơn 0")
    p = db.get(Product, item.product_id)
    if p and p.stock < quantity:
        fail(400, "BAD_REQUEST", f"Sản phẩm không đủ tồn kho (còn {p.stock})")
    item.quantity = quantity
    db.commit()
    return ok({})


def delete_cart(db: Session, user: User, item_id: int):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy item")
    db.delete(item)
    db.commit()


def my_seller_request(db: Session, user: User):
    item = db.scalar(select(SellerRequest).where(SellerRequest.user_id == user.id).order_by(SellerRequest.id.desc()))
    return ok({"item": None if not item else {"id": item.id, "status": item.status, "shop_name": item.shop_name, "reason": item.reason}})


def create_seller_request(db: Session, user: User, shop_name: str, description: str, contact: str):
    existing = db.scalar(select(SellerRequest).where(SellerRequest.user_id == user.id, SellerRequest.status == "pending"))
    if existing:
        fail(409, "CONFLICT", "Đã có yêu cầu đang chờ duyệt")
    req = SellerRequest(user_id=user.id, shop_name=shop_name, description=description, contact=contact)
    db.add(req)
    db.commit()
    return ok({"id": req.id})


def create_report(db: Session, user: User, target_type: str, target_id: int, reason: str):
    report = Report(reporter_id=user.id, target_type=target_type, target_id=target_id, reason=reason)
    db.add(report)
    db.commit()
    return ok({"id": report.id})


def list_notifications(db: Session, user: User):
    items = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc())).all()
    return ok({"items": [{"id": n.id, "content": n.content, "type": n.type, "channel": n.channel, "is_read": n.is_read, "created_at": n.created_at.isoformat() if n.created_at else None} for n in items]})


def mark_notification_read(db: Session, user: User, notification_id: int, is_read: bool):
    item = db.get(Notification, notification_id)
    if not item or item.user_id != user.id:
        fail(404, "NOT_FOUND", "Không tìm thấy thông báo")
    item.is_read = is_read
    db.commit()
    return ok({})


def mark_all_notifications_read(db: Session, user: User):
    items = db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))).all()
    for n in items:
        n.is_read = True
    db.commit()
    return ok({"updated": len(items)})
