from app.core.exceptions import setup_exception_handlers
from fastapi import FastAPI
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, request_logging_middleware
from app.core.rate_limit import limiter
from app.core.tracing import configure_tracing
from app.db.session import engine
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
