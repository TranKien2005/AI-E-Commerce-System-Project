import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.models.entities import AuditLog, Notification, Order, Payment, Product, Report, SellerRequest, Shop, User
from app.services.email_service import send_email

logger = logging.getLogger(__name__)


def _send_email_after_commit(to_email: str, subject: str, html: str):
    try:
        send_email(to_email, subject, html)
    except Exception:
        logger.exception("Failed to send email", extra={"to_email": to_email, "subject": subject})


def patch_user(db: Session, admin_id: int, user_id: int, status: str | None, role: str | None):
    user = db.get(User, user_id)
    if not user:
        fail(404, "NOT_FOUND", "Không tìm thấy người dùng")
    if user_id == admin_id and ((role and role != "admin") or (status and status != "active")):
        fail(400, "BAD_REQUEST", "Admin cannot remove their own access")
    if status:
        user.status = status
    if role:
        user.role = role
    db.add(AuditLog(admin_id=admin_id, action="patch_user", target_type="user", target_id=user_id, description="Admin updated user"))
    db.commit()
    return ok({})


def list_seller_requests(db: Session):
    items = db.scalars(select(SellerRequest).where(SellerRequest.status == "pending").order_by(SellerRequest.id.desc())).all()
    return ok({"items": [{"id": i.id, "user_id": i.user_id, "shop_name": i.shop_name, "status": i.status} for i in items]})


def patch_seller_request(db: Session, admin_id: int, request_id: int, action: str, reason: str):
    req = db.get(SellerRequest, request_id)
    if not req:
        fail(404, "NOT_FOUND", "Không tìm thấy yêu cầu")
    if action not in {"approve", "reject"}:
        fail(400, "BAD_REQUEST", "Hành động không hợp lệ")
    if req.status != "pending":
        fail(400, "BAD_REQUEST", "Yêu cầu này đã được xử lý")
    req.status = "approved" if action == "approve" else "rejected"
    req.reason = reason
    email_payload: tuple[str, str, str] | None = None
    if action == "approve":
        user = db.get(User, req.user_id)
        if user:
            user.role = "seller"
            existing_shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
            if not existing_shop:
                shop = Shop(owner_id=user.id, name=req.shop_name, description=req.description)
                db.add(shop)
            db.add(Notification(user_id=user.id, content=f"Yêu cầu trở thành người bán đã được duyệt. Cửa hàng '{req.shop_name}' đã được tạo.", type="system", channel="email"))
            email_payload = (user.email, "Yêu cầu mở cửa hàng đã được duyệt", f"Chúc mừng! Cửa hàng <b>{req.shop_name}</b> đã được tạo thành công.")
    else:
        db.add(Notification(user_id=req.user_id, content=f"Yêu cầu trở thành người bán đã bị từ chối. Lý do: {reason}", type="system", channel="email"))
        user = db.get(User, req.user_id)
        if user:
            email_payload = (user.email, "Yêu cầu mở cửa hàng bị từ chối", f"Yêu cầu mở cửa hàng đã bị từ chối. Lý do: {reason}")
    db.add(AuditLog(admin_id=admin_id, action="patch_seller_request", target_type="seller_request", target_id=request_id, description="Admin moderated seller request"))
    db.commit()
    if email_payload:
        _send_email_after_commit(*email_payload)
    return ok({})


def list_reports(db: Session):
    items = db.scalars(select(Report)).all()
    return ok({"items": [{"id": r.id, "target_type": r.target_type, "target_id": r.target_id, "reason": r.reason, "status": r.status} for r in items]})


def patch_report(db: Session, admin_id: int, report_id: int, status_value: str):
    item = db.get(Report, report_id)
    if not item:
        fail(404, "NOT_FOUND", "Không tìm thấy báo cáo")
    item.status = status_value
    db.add(AuditLog(admin_id=admin_id, action="patch_report", target_type="report", target_id=report_id, description="Admin updated report"))
    db.commit()
    return ok({})


def audit_logs(db: Session):
    items = db.scalars(select(AuditLog).order_by(AuditLog.id.desc())).all()
    return ok({"items": [{"id": a.id, "action": a.action, "target_type": a.target_type, "target_id": a.target_id} for a in items]})


def metrics(db: Session):
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_orders = db.scalar(select(func.count()).select_from(Order)) or 0
    total_payments = db.scalar(select(func.count()).select_from(Payment)) or 0
    total_products = db.scalar(select(func.count()).select_from(Product).where(Product.deleted_at.is_(None))) or 0
    total_shops = db.scalar(select(func.count()).select_from(Shop)) or 0
    pending_seller_requests = db.scalar(select(func.count()).select_from(SellerRequest).where(SellerRequest.status == "pending")) or 0
    pending_reports = db.scalar(select(func.count()).select_from(Report).where(Report.status == "pending")) or 0
    successful_payments = db.scalar(select(func.count()).select_from(Payment).where(Payment.status == "success")) or 0
    total_revenue = db.scalar(select(func.coalesce(func.sum(Order.total_price), 0)).where(Order.payment_status == "success")) or 0

    return ok({
        "users": total_users,
        "orders": total_orders,
        "payments": total_payments,
        "products": total_products,
        "shops": total_shops,
        "pending_seller_requests": pending_seller_requests,
        "pending_reports": pending_reports,
        "successful_payments": successful_payments,
        "revenue": float(total_revenue),
    })


def logs(db: Session):
    items = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(50)).all()
    return ok({
        "items": [
            {
                "id": item.id,
                "admin_id": item.admin_id,
                "action": item.action,
                "target_type": item.target_type,
                "target_id": item.target_id,
                "description": item.description,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ]
    })




def list_users(db: Session, role: str | None, status: str | None, keyword: str | None, page: int, page_size: int):
    users = db.scalars(select(User)).all()
    if role:
        users = [u for u in users if u.role == role]
    if status:
        users = [u for u in users if u.status == status]
    if keyword:
        kw = keyword.lower().strip()
        users = [u for u in users if kw in u.email.lower() or kw in u.full_name.lower()]
    total = len(users)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = users[start:end]
    return ok({"items": [{"id": u.id, "email": u.email, "role": u.role, "status": u.status} for u in page_items], "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size if page_size else 1}})
