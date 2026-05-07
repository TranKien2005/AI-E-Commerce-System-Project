from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.core.responses import ok
from app.db.session import get_db
from app.models.entities import User
from app.services import admin_service


router = APIRouter(prefix="/admin", tags=["admin"])


class PatchUserIn(BaseModel):
    status: str | None = None
    role: str | None = None


class PatchSellerRequestIn(BaseModel):
    action: str
    reason: str = ""


@router.get("/users")
def list_users(
    role: str | None = None,
    status: str | None = None,
    keyword: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return admin_service.list_users(db, role, status, keyword, page, page_size)


@router.patch("/users/{id}")
def patch_user(id: int, payload: PatchUserIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    return admin_service.patch_user(db, current_user.id, id, payload.status, payload.role)


@router.get("/seller-requests")
def list_seller_requests(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    return admin_service.list_seller_requests(db)


@router.patch("/seller-requests/{id}")
def patch_seller_request(id: int, payload: PatchSellerRequestIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    return admin_service.patch_seller_request(db, current_user.id, id, payload.action, payload.reason)


@router.get("/reports")
def list_reports(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    return admin_service.list_reports(db)


class PatchReportIn(BaseModel):
    status: str


@router.patch("/reports/{id}")
def patch_report(id: int, payload: PatchReportIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    return admin_service.patch_report(db, current_user.id, id, payload.status)


@router.get("/audit-logs")
def audit_logs(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    return admin_service.audit_logs(db)


@router.get("/metrics")
def metrics(current_user: User = Depends(require_roles("admin"))):
    return admin_service.metrics()


@router.get("/logs")
def logs(current_user: User = Depends(require_roles("admin"))):
    return admin_service.logs()
