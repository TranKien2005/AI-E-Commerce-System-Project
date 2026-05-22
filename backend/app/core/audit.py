import logging

from fastapi import Request
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_token
from app.db.session import new_session
from app.models.entities import AuditLog, User


logger = logging.getLogger(__name__)
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIPPED_PATHS = {
    "/health",
    "/metrics",
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
}


def _actor_id(request: Request) -> int | None:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    try:
        payload = decode_token(header.split(" ", 1)[1])
    except (JWTError, ValueError, TypeError):
        return None
    if payload.get("type") != "access":
        return None
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None
    request.state.user_id = user_id
    return user_id


def _target(path: str) -> tuple[str, int]:
    parts = [part for part in path.split("/") if part]
    if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
        resource_parts = parts[2:]
    else:
        resource_parts = parts
    target_type = resource_parts[0] if resource_parts else "unknown"
    target_id = 0
    for part in reversed(resource_parts):
        if part.isdigit():
            target_id = int(part)
            break
    return target_type[:50], target_id


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        actor_id = _actor_id(request)
        response = await call_next(request)
        if not self._should_audit(request, response.status_code, actor_id):
            return response
        target_type, target_id = _target(request.url.path)
        db = new_session()
        try:
            if db.get(User, actor_id):
                db.add(
                    AuditLog(
                        admin_id=actor_id,
                        action=f"{request.method.lower()}_{target_type}",
                        target_type=target_type,
                        target_id=target_id,
                        description=f"{request.method} {request.url.path}",
                    )
                )
                db.commit()
        except Exception:
            db.rollback()
            logger.exception("audit_log_failed", extra={"method": request.method, "path": request.url.path, "user_id": actor_id})
        finally:
            db.close()
        return response

    def _should_audit(self, request: Request, status_code: int, actor_id: int | None) -> bool:
        return (
            request.method in MUTATING_METHODS
            and status_code < 400
            and actor_id is not None
            and request.url.path not in SKIPPED_PATHS
        )
