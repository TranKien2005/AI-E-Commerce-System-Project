from pydantic import BaseModel


class ShopIn(BaseModel):
    name: str
    description: str = ""


class ProductIn(BaseModel):
    name: str
    description: str = ""
    price: float
    stock: int
    category_id: int | None = None


class OrderStatusIn(BaseModel):
    status: str


class ShippingIn(BaseModel):
    shipping_status: str
    shipping_note: str = ""


class ChatbotConfigIn(BaseModel):
    api_key: str
    prompt: str = ""
    template: str = ""
    is_enabled: bool = False
