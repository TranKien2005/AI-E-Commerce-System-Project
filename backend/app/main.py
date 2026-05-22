from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1.router import api_router
from app.core.audit import AuditLogMiddleware
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.core.logging import RequestLoggingMiddleware, configure_logging
from app.core.rate_limit import setup_rate_limit
from app.core.tracing import setup_tracing


configure_logging()
app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditLogMiddleware)
app.add_middleware(RequestLoggingMiddleware)
setup_rate_limit(app)
setup_tracing(app)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
setup_exception_handlers(app)
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health")
def health_check():
    return {"success": True, "data": {"status": "ok"}, "message": "OK"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
