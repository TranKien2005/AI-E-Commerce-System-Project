from fastapi import APIRouter

from app.api.v1 import admin, auth, buyer, chat_ws, seller


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(buyer.router)
api_router.include_router(seller.router)
api_router.include_router(chat_ws.router)
api_router.include_router(admin.router)
