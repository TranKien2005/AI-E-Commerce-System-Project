from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.models.entities import AuditLog, Notification, Report, SellerRequest, Shop, User
from app.services.email_service import send_email


def patch_user(db: Session, admin_id: int, user_id: int, status: str | None, role: str | None):
    user = db.get(User, user_id)
    if not user:
        fail(404, "NOT_FOUND", "Không tìm thấy người dùng")
    if status:
        user.status = status
    if role:
        user.role = role
    db.add(AuditLog(admin_id=admin_id, action="patch_user", target_type="user", target_id=user_id, description="Admin updated user"))
    db.commit()
    return ok({})


def list_seller_requests(db: Session):
    items = db.scalars(select(SellerRequest)).all()
    return ok({"items": [{"id": i.id, "user_id": i.user_id, "shop_name": i.shop_name, "status": i.status} for i in items]})


def patch_seller_request(db: Session, admin_id: int, request_id: int, action: str, reason: str):
    req = db.get(SellerRequest, request_id)
    if not req:
        fail(404, "NOT_FOUND", "Không tìm thấy yêu cầu")
    if action not in {"approve", "reject"}:
        fail(400, "BAD_REQUEST", "Hành động không hợp lệ")
    req.status = "approved" if action == "approve" else "rejected"
    req.reason = reason
    if action == "approve":
        user = db.get(User, req.user_id)
        if user:
            user.role = "seller"
            # Create shop for the newly approved seller
            existing_shop = db.scalar(select(Shop).where(Shop.owner_id == user.id))
            if not existing_shop:
                shop = Shop(owner_id=user.id, name=req.shop_name, description=req.description)
                db.add(shop)
            db.add(Notification(user_id=user.id, content=f"Yêu cầu trở thành người bán đã được duyệt. Cửa hàng '{req.shop_name}' đã được tạo.", type="system", channel="email"))
            send_email(user.email, "Yêu cầu mở cửa hàng đã được duyệt", f"Chúc mừng! Cửa hàng <b>{req.shop_name}</b> đã được tạo thành công.")
    else:
        db.add(Notification(user_id=req.user_id, content=f"Yêu cầu trở thành người bán đã bị từ chối. Lý do: {reason}", type="system", channel="email"))
        user = db.get(User, req.user_id)
        if user:
            send_email(user.email, "Yêu cầu mở cửa hàng bị từ chối", f"Yêu cầu mở cửa hàng đã bị từ chối. Lý do: {reason}")
    db.add(AuditLog(admin_id=admin_id, action="patch_seller_request", target_type="seller_request", target_id=request_id, description="Admin moderated seller request"))
    db.commit()
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


def metrics():
    return ok({"users": 0, "orders": 0, "payments": 0})


def logs():
    return ok({"items": []})




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
