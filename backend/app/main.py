from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings


app = FastAPI(title=settings.APP_NAME)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def health_check():
    return {"success": True, "data": {"status": "ok"}, "message": "OK"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)