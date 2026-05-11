import logging
import random
import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import fail, ok
from app.core.security import create_token, decode_token, get_password_hash, verify_password
from app.models.entities import User
from app.services.email_service import send_otp_email

logger = logging.getLogger(__name__)

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
        if existing.email_verified_at is None or existing.status == "pending_verification":
            return resend_verification_otp(db, email)
        fail(409, "CONFLICT", "Email đã tồn tại")
    user = User(
        email=email,
        password=get_password_hash(password),
        full_name=full_name.strip(),
        status="pending_verification",
        email_verified_at=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    otp = _generate_otp()
    _store_otp(email, otp)
    try:
        send_otp_email(email, otp)
    except Exception:
        logger.exception("Failed to send verification OTP", extra={"email": email})

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
    user.email_verified_at = datetime.now(timezone.utc)
    if user.status == "pending_verification":
        user.status = "active"
    db.commit()
    return ok({"verified": True})


def resend_verification_otp(db: Session, email: str):
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        fail(404, "NOT_FOUND", "Không tìm thấy người dùng")
    if user.email_verified_at is not None and user.status == "active":
        fail(409, "CONFLICT", "Email đã được xác thực")

    otp = _generate_otp()
    _store_otp(email, otp)
    try:
        send_otp_email(email, otp)
    except Exception:
        logger.exception("Failed to resend verification OTP", extra={"email": email})
    return ok({"sent": True, "email": email})


def login(db: Session, email: str, password: str):
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if not user or not verify_password(password, user.password):
        fail(401, "UNAUTHORIZED", "Sai thông tin đăng nhập")
    if user.email_verified_at is None:
        fail(403, "FORBIDDEN", "Tài khoản chưa xác thực email")
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

    otp = _generate_otp()
    _store_otp(email, otp)
    try:
        send_otp_email(email, otp)
    except Exception:
        logger.exception("Failed to send password reset OTP", extra={"email": email})

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
