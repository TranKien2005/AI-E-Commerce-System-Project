import random
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.core.security import create_token, decode_token, get_password_hash, verify_password
from app.models.entities import User
from app.services.email_service import send_otp_email

revoked_refresh_tokens: set[str] = set()

# In-memory OTP store: {email: {"code": "123456", "expires": timestamp}}
# In production, use Redis instead
_otp_store: dict[str, dict] = {}
OTP_EXPIRE_SECONDS = 300  # 5 minutes


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _store_otp(email: str, code: str):
    _otp_store[email] = {"code": code, "expires": time.time() + OTP_EXPIRE_SECONDS}


def _verify_otp(email: str, code: str) -> bool:
    entry = _otp_store.get(email)
    if not entry:
        return False
    if time.time() > entry["expires"]:
        del _otp_store[email]
        return False
    if entry["code"] != code:
        return False
    del _otp_store[email]  # OTP is single-use
    return True


def valid_password(password: str) -> bool:
    if len(password) < 8:
        return False
    return any(c.isupper() for c in password) and any(c.islower() for c in password) and any(c.isdigit() for c in password) and any(not c.isalnum() for c in password)


def ensure_password(password: str):
    if not valid_password(password):
        fail(422, "VALIDATION_ERROR", "Mật khẩu không đáp ứng chính sách bảo mật", ["Tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số, ký tự đặc biệt"])


def register(db: Session, email: str, password: str, full_name: str):
    ensure_password(password)
    email = email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        fail(409, "CONFLICT", "Email đã tồn tại")
    user = User(email=email, password=get_password_hash(password), full_name=full_name.strip())
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate and send OTP for email verification
    otp = _generate_otp()
    _store_otp(email, otp)
    send_otp_email(email, otp)

    return ok({"id": user.id, "email": user.email})


def verify_otp(db: Session, email: str, otp: str):
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        fail(404, "NOT_FOUND", "Không tìm thấy người dùng")
    if not otp:
        fail(400, "BAD_REQUEST", "OTP không hợp lệ")
    if not _verify_otp(email, otp):
        fail(400, "BAD_REQUEST", "Mã OTP sai hoặc đã hết hạn")
    # Mark user as verified (status stays active since we default to active)
    return ok({"verified": True})


def login(db: Session, email: str, password: str):
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if not user or not verify_password(password, user.password):
        fail(401, "UNAUTHORIZED", "Sai thông tin đăng nhập")
    if user.status != "active":
        fail(403, "FORBIDDEN", "Tài khoản không ở trạng thái active")
    access_token = create_token(str(user.id), 60, "access")
    refresh_token = create_token(str(user.id), 60 * 24 * 14, "refresh")
    return ok({"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"})


def refresh(refresh_token: str):
    if refresh_token in revoked_refresh_tokens:
        fail(401, "UNAUTHORIZED", "Refresh token đã bị thu hồi")
    try:
        token = decode_token(refresh_token)
    except ValueError:
        fail(401, "UNAUTHORIZED", "Refresh token không hợp lệ")
    if token.get("type") != "refresh" or not token.get("sub"):
        fail(401, "UNAUTHORIZED", "Token không hợp lệ")
    new_access = create_token(token.get("sub"), 60, "access")
    return ok({"access_token": new_access})


def logout(refresh_token: str):
    if not refresh_token:
        fail(422, "VALIDATION_ERROR", "Thiếu refresh_token")
    revoked_refresh_tokens.add(refresh_token)
    return ok({})


def forgot_password(db: Session, email: str):
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        fail(404, "NOT_FOUND", "Không tìm thấy người dùng")

    # Generate and send OTP for password reset
    otp = _generate_otp()
    _store_otp(email, otp)
    send_otp_email(email, otp)

    return ok({"sent": True})


def reset_password(db: Session, email: str, otp: str, new_password: str):
    ensure_password(new_password)
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        fail(404, "NOT_FOUND", "Không tìm thấy người dùng")
    if not otp:
        fail(400, "BAD_REQUEST", "OTP không hợp lệ")
    if not _verify_otp(email, otp):
        fail(400, "BAD_REQUEST", "Mã OTP sai hoặc đã hết hạn")
    user.password = get_password_hash(new_password)
    db.commit()
    return ok({})
