from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Product, ProductImage, Shop


def _serialize_product_for_buyer(db: Session, p: Product) -> dict:
    """Serialize product for public listing — includes primary image and shop name."""
    primary_image = db.scalar(
        select(ProductImage).where(ProductImage.product_id == p.id, ProductImage.is_primary.is_(True))
    )
    if not primary_image:
        primary_image = db.scalar(select(ProductImage).where(ProductImage.product_id == p.id))
    shop = db.get(Shop, p.shop_id)
    return {
        "id": p.id,
        "name": p.name,
        "price": float(p.price),
        "stock": p.stock,
        "primary_image": primary_image.url if primary_image else None,
        "shop_id": p.shop_id,
        "shop_name": shop.name if shop else None,
    }


def _build_query(db: Session, query: str, page: int, page_size: int,
                 category_id: int | None = None, shop_id: int | None = None,
                 min_price: float | None = None, max_price: float | None = None,
                 sort: str | None = None):
    """Build filtered and sorted product query for public search."""
    stmt = select(Product).where(Product.deleted_at.is_(None))

    # Keyword filter
    if query:
        stmt = stmt.where(Product.name.ilike(f"%{query}%"))

    # Category filter
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)

    # Shop filter
    if shop_id is not None:
        stmt = stmt.where(Product.shop_id == shop_id)

    # Price range filter
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)

    # Sorting
    if sort == "price_asc":
        stmt = stmt.order_by(Product.price.asc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.price.desc())
    elif sort == "newest":
        stmt = stmt.order_by(Product.id.desc())
    else:
        stmt = stmt.order_by(Product.id.desc())

    products = db.scalars(stmt).all()
    total = len(products)
    start = (page - 1) * page_size
    end = start + page_size
    items = products[start:end]
    return {
        "items": [_serialize_product_for_buyer(db, p) for p in items],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if page_size else 1,
        },
    }


def search_products(db: Session, query: str, page: int, page_size: int,
                    category_id: int | None = None, shop_id: int | None = None,
                    min_price: float | None = None, max_price: float | None = None,
                    sort: str | None = None):
    return _build_query(db, query, page, page_size,
                        category_id=category_id, shop_id=shop_id,
                        min_price=min_price, max_price=max_price, sort=sort)


def recommend_products(db: Session, page: int, page_size: int):
    # Mock: return newest products as recommendations
    return _build_query(db, "", page, page_size, sort="newest")
