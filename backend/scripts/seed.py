from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.entities import Category, ChatbotConfig, Order, OrderItem, Product, SellerRequest, Shop, User


def run_seed() -> None:
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == "admin@example.com"))
        if not admin:
            admin = User(email="admin@example.com", password=get_password_hash("Admin@123"), full_name="System Admin", role="admin", status="active")
            db.add(admin)

        seller = db.scalar(select(User).where(User.email == "seller@example.com"))
        if not seller:
            seller = User(email="seller@example.com", password=get_password_hash("Seller@123"), full_name="Demo Seller", role="seller", status="active")
            db.add(seller)
            db.flush()
            db.add(Shop(owner_id=seller.id, name="Demo Shop", description="Shop mẫu"))

        buyer = db.scalar(select(User).where(User.email == "buyer@example.com"))
        if not buyer:
            buyer = User(email="buyer@example.com", password=get_password_hash("Buyer@123"), full_name="Demo Buyer", role="buyer", status="active")
            db.add(buyer)

        cat = db.scalar(select(Category).where(Category.name == "Điện tử"))
        if not cat:
            cat = Category(name="Điện tử")
            db.add(cat)
            db.flush()

        shop = db.scalar(select(Shop).where(Shop.name == "Demo Shop"))
        if shop:
            product = db.scalar(select(Product).where(Product.name == "Laptop Gaming A"))
            if not product:
                product = Product(shop_id=shop.id, category_id=cat.id, name="Laptop Gaming A", description="Sản phẩm mẫu", price=19990000, stock=20)
                db.add(product)
                db.flush()

            cfg = db.scalar(select(ChatbotConfig).where(ChatbotConfig.shop_id == shop.id))
            if not cfg:
                db.add(ChatbotConfig(shop_id=shop.id, api_key="sk-test-abcdefgh1234", prompt="Bạn là trợ lý shop", template="default", is_enabled=True))

            delivered = db.scalar(select(Order).where(Order.user_id == buyer.id, Order.status == "delivered")) if buyer else None
            if buyer and product and not delivered:
                delivered = Order(user_id=buyer.id, total_price=float(product.price), status="delivered", payment_status="success", shipping_address="Hanoi", shipping_status="delivered", shipping_note="seed")
                db.add(delivered)
                db.flush()
                db.add(OrderItem(order_id=delivered.id, product_id=product.id, quantity=1, price=product.price))

        req = db.scalar(select(SellerRequest).where(SellerRequest.shop_name == "Candidate Shop"))
        if not req and buyer:
            db.add(SellerRequest(user_id=buyer.id, shop_name="Candidate Shop", description="Xin mở shop", contact="0123456789"))

        db.commit()
        print("Seed data inserted/updated successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
