from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import ForgotPasswordIn, LoginIn, LogoutIn, RefreshIn, RegisterIn, ResendVerificationOtpIn, ResetPasswordIn, VerifyOtpIn
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    return auth_service.register(db, payload.email, payload.password, payload.full_name)


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpIn, db: Session = Depends(get_db)):
    return auth_service.verify_otp(db, payload.email, payload.otp)


@router.post("/resend-verification-otp")
def resend_verification_otp(payload: ResendVerificationOtpIn, db: Session = Depends(get_db)):
    return auth_service.resend_verification_otp(db, payload.email)


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    return auth_service.login(db, payload.email, payload.password)


@router.post("/refresh")
def refresh(payload: RefreshIn):
    return auth_service.refresh(payload.refresh_token)


@router.post("/logout")
def logout(payload: LogoutIn):
    return auth_service.logout(payload.refresh_token)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    return auth_service.forgot_password(db, payload.email)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    return auth_service.reset_password(db, payload.email, payload.otp, payload.new_password)
