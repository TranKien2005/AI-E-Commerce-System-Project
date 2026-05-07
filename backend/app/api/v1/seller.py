from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.core.responses import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.seller import ChatbotConfigIn, ProductIn, ShopIn
from app.services import seller_service


router = APIRouter(prefix="/seller", tags=["seller"])


class OrderStatusIn(BaseModel):
    status: str


class ShippingIn(BaseModel):
    shipping_status: str
    shipping_note: str = ""


@router.get("/shop")
def get_shop(db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.get_shop(db, current_user)


@router.put("/shop")
def update_shop(payload: ShopIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.update_shop(db, current_user, payload.name, payload.description)


@router.get("/products")
def list_seller_products(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("seller", "admin")),
):
    return seller_service.list_products(db, current_user, page, page_size)


@router.post("/products", status_code=201)
def create_product(payload: ProductIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.create_product(db, current_user, payload.name, payload.description, payload.price, payload.stock, payload.category_id)


@router.put("/products/{id}")
def update_product(id: int, payload: ProductIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.update_product(db, current_user, id, payload.name, payload.description, payload.price, payload.stock, payload.category_id)


@router.delete("/products/{id}", status_code=204)
def delete_product(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    seller_service.delete_product(db, current_user, id)


@router.post("/products/{id}/images", status_code=201)
def add_product_image(id: int, url: str, is_primary: bool = False, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.add_product_image(db, current_user, id, url, is_primary)


@router.delete("/products/images/{id}", status_code=204)
def delete_product_image(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    seller_service.delete_product_image(db, id)


@router.get("/orders")
def list_orders(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.list_orders(db, current_user, page, page_size)


@router.get("/orders/{id}")
def get_order(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.get_order(db, current_user, id)


@router.patch("/orders/{id}")
def update_order_status(id: int, payload: OrderStatusIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.update_order_status(db, current_user, id, payload.status)


@router.patch("/orders/{id}/shipping")
def update_shipping(id: int, payload: ShippingIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.update_shipping(db, current_user, id, payload.shipping_status, payload.shipping_note)


@router.get("/chatbot-config")
def get_chatbot_config(db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.get_chatbot_config(db, current_user)


@router.patch("/chatbot-config")
def patch_chatbot_config(payload: ChatbotConfigIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.patch_chatbot_config(db, current_user, payload.api_key, payload.prompt, payload.template, payload.is_enabled)


@router.get("/stats")
def get_stats(from_date: str | None = None, to_date: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_roles("seller", "admin"))):
    return seller_service.get_stats(db, current_user, from_date, to_date)
