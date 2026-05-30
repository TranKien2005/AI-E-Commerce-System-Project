from app.core.exceptions import setup_exception_handlers
from fastapi import FastAPI
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, request_logging_middleware
from app.core.rate_limit import limiter
from app.core.tracing import configure_tracing
from app.core.metrics import DB_POOL_ACTIVE, DB_POOL_IDLE, DB_POOL_OVERFLOW
from app.db.session import engine


def _poll_pool_metrics():
    import time
    from sqlalchemy.pool import NullPool

    while True:
        pool = engine.pool
        if isinstance(pool, NullPool):
            time.sleep(30)
            continue
        try:
            checked_out = pool.checkedout()
            size = pool.size()
            overflow = pool.overflow()
            DB_POOL_ACTIVE.set(checked_out)
            DB_POOL_IDLE.set(max(size - checked_out, 0))
            DB_POOL_OVERFLOW.set(overflow)
        except Exception:
            pass
        time.sleep(10)

from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


configure_logging()
app = FastAPI(title=settings.APP_NAME)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.middleware("http")(request_logging_middleware)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
configure_tracing(app, engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.BACKEND_CORS_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
setup_exception_handlers(app)


@app.get("/health")
def health_check():
    return {"success": True, "data": {"status": "ok"}, "message": "OK"}




@app.on_event("startup")
def startup_event():
    import threading

    threading.Thread(target=_poll_pool_metrics, daemon=True).start()
    from app.db.session import SessionLocal
    from app.services.search_service import init_search_index

    def run_indexing():
        db = SessionLocal()
        try:
            init_search_index(db)
        finally:
            db.close()

    threading.Thread(target=run_indexing, daemon=True).start()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
