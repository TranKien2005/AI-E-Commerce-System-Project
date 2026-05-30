from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.schemas.auth import (
    ForgotPasswordIn,
    LoginIn,
    LogoutIn,
    RefreshIn,
    RegisterIn,
    ResendVerificationOtpIn,
    ResetPasswordIn,
    VerifyOtpIn,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def register(request: Request, payload: RegisterIn, db: Session = Depends(get_db)):
    return auth_service.register(db, payload.email, payload.password, payload.full_name)


@router.post("/verify-otp")
@limiter.limit(settings.RATE_LIMIT_AUTH)
def verify_otp(request: Request, payload: VerifyOtpIn, db: Session = Depends(get_db)):
    return auth_service.verify_otp(db, payload.email, payload.otp)


@router.post("/resend-verification-otp")
@limiter.limit(settings.RATE_LIMIT_AUTH)
def resend_verification_otp(
    request: Request, payload: ResendVerificationOtpIn, db: Session = Depends(get_db)
):
    return auth_service.resend_verification_otp(db, payload.email)


@router.post("/login")
@limiter.limit(settings.RATE_LIMIT_AUTH)
def login(request: Request, payload: LoginIn, db: Session = Depends(get_db)):
    return auth_service.login(db, payload.email, payload.password)


@router.post("/token", include_in_schema=False)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def token(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    result = auth_service.login(db, form.username, form.password)
    return result["data"]


@router.post("/refresh")
def refresh(payload: RefreshIn):
    return auth_service.refresh(payload.refresh_token)


@router.post("/logout")
def logout(payload: LogoutIn):
    return auth_service.logout(payload.refresh_token)


@router.post("/forgot-password")
@limiter.limit(settings.RATE_LIMIT_AUTH)
def forgot_password(
    request: Request, payload: ForgotPasswordIn, db: Session = Depends(get_db)
):
    return auth_service.forgot_password(db, payload.email)


@router.post("/reset-password")
@limiter.limit(settings.RATE_LIMIT_AUTH)
def reset_password(
    request: Request, payload: ResetPasswordIn, db: Session = Depends(get_db)
):
    return auth_service.reset_password(
        db, payload.email, payload.otp, payload.new_password
    )
