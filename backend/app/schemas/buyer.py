from pydantic import BaseModel


class UpdateMeIn(BaseModel):
    full_name: str


class CartAddIn(BaseModel):
    product_id: int
    quantity: int


class CartUpdateIn(BaseModel):
    quantity: int


class CreateOrderIn(BaseModel):
    shipping_address: str


class ReviewIn(BaseModel):
    product_id: int
    rating: int
    comment: str = ""


class ConversationIn(BaseModel):
    seller_id: int


class MessageIn(BaseModel):
    content: str


class ReportIn(BaseModel):
    target_type: str
    target_id: int
    reason: str


class SellerRequestIn(BaseModel):
    shop_name: str
    description: str
    contact: str


class IntentSearchIn(BaseModel):
    query: str
    page: int = 1
    page_size: int = 20


class NotificationReadIn(BaseModel):
    is_read: bool = True
