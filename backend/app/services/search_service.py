import re

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.models.entities import Category, OrderItem, Product, ProductImage, Review, Shop


_IMAGE_URL_RE = re.compile(r"https?://\S+")


def sanitize_image_url(value: str | None) -> str | None:
    if not value:
        return None
    match = _IMAGE_URL_RE.search(value.strip())
    return match.group(0) if match else None


def _product_metrics(db: Session, product_id: int) -> tuple[float | None, int, int]:
    rating_row = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.product_id == product_id)
    ).one()
    sold_count = db.scalar(select(func.coalesce(func.sum(OrderItem.quantity), 0)).where(OrderItem.product_id == product_id)) or 0
    avg_rating = round(float(rating_row[0]), 1) if rating_row[0] is not None else None
    return avg_rating, int(rating_row[1] or 0), int(sold_count)


def _serialize_product_for_buyer(db: Session, p: Product) -> dict:
    """Serialize product for public listing — includes primary image and shop name."""
    primary_image = db.scalar(
        select(ProductImage).where(ProductImage.product_id == p.id, ProductImage.is_primary.is_(True))
    )
    if not primary_image:
        primary_image = db.scalar(select(ProductImage).where(ProductImage.product_id == p.id))
    shop = db.get(Shop, p.shop_id)
    category = db.get(Category, p.category_id) if p.category_id else None
    avg_rating, review_count, sold_count = _product_metrics(db, p.id)
    return {
        "id": p.id,
        "name": p.name,
        "price": float(p.price),
        "stock": p.stock,
        "primary_image": sanitize_image_url(primary_image.url) if primary_image else None,
        "shop_id": p.shop_id,
        "shop_name": shop.name if shop else None,
        "category_id": p.category_id,
        "category": {"id": category.id, "name": category.name} if category else None,
        "avg_rating": avg_rating,
        "review_count": review_count,
        "sold_count": sold_count,
    }


def _meta(page: int, page_size: int, total: int) -> dict:
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1,
    }


def _serialize_shop_for_search(db: Session, shop: Shop) -> dict:
    product_count = db.scalar(select(func.count(Product.id)).where(Product.shop_id == shop.id, Product.deleted_at.is_(None))) or 0
    sold_count = db.scalar(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Product, Product.id == OrderItem.product_id)
        .where(Product.shop_id == shop.id)
    ) or 0
    top_image = db.scalar(
        select(ProductImage.url)
        .join(Product, Product.id == ProductImage.product_id)
        .where(Product.shop_id == shop.id, Product.deleted_at.is_(None))
        .order_by(ProductImage.is_primary.desc(), ProductImage.id.asc())
    )
    return {
        "id": shop.id,
        "name": shop.name,
        "description": shop.description,
        "product_count": int(product_count),
        "sold_count": int(sold_count),
        "top_product_image": sanitize_image_url(top_image),
    }


def _build_query(db: Session, query: str, page: int, page_size: int,
                 category_id: int | None = None, shop_id: int | None = None,
                 min_price: float | None = None, max_price: float | None = None,
                 min_rating: int | None = None, sort: str | None = None,
                 product_ids: list[int] | None = None):
    rating_subquery = (
        select(Review.product_id.label("product_id"), func.avg(Review.rating).label("avg_rating"))
        .group_by(Review.product_id)
        .subquery()
    )
    sold_subquery = (
        select(OrderItem.product_id.label("product_id"), func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_count"))
        .group_by(OrderItem.product_id)
        .subquery()
    )
    filters = [Product.deleted_at.is_(None)]
    if query and product_ids is None:
        filters.append(Product.name.ilike(f"%{query}%"))
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if shop_id is not None:
        filters.append(Product.shop_id == shop_id)
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if min_rating is not None:
        filters.append(rating_subquery.c.avg_rating >= min_rating)
    if product_ids is not None:
        filters.append(Product.id.in_(product_ids))

    stmt = (
        select(Product)
        .outerjoin(rating_subquery, rating_subquery.c.product_id == Product.id)
        .outerjoin(sold_subquery, sold_subquery.c.product_id == Product.id)
        .where(and_(*filters))
    )
    total_stmt = (
        select(func.count(Product.id))
        .outerjoin(rating_subquery, rating_subquery.c.product_id == Product.id)
        .where(and_(*filters))
    )

    if sort == "price_asc":
        stmt = stmt.order_by(Product.price.asc(), Product.id.desc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.price.desc(), Product.id.desc())
    elif sort in {"top_sales", "popular"}:
        stmt = stmt.order_by(func.coalesce(sold_subquery.c.sold_count, 0).desc(), Product.id.desc())
    elif sort == "newest":
        stmt = stmt.order_by(Product.id.desc())
    else:
        if product_ids:
            whens = {pid: i for i, pid in enumerate(product_ids)}
            stmt = stmt.order_by(case(whens, value=Product.id))
        else:
            stmt = stmt.order_by(Product.id.desc())

    safe_page = max(page, 1)
    safe_page_size = max(min(page_size, 100), 1)
    total = int(db.scalar(total_stmt) or 0)
    items = db.scalars(stmt.offset((safe_page - 1) * safe_page_size).limit(safe_page_size)).all()
    return {"items": [_serialize_product_for_buyer(db, p) for p in items], "meta": _meta(safe_page, safe_page_size, total)}


def search_shops(db: Session, query: str, page: int, page_size: int):
    safe_page = max(page, 1)
    safe_page_size = max(min(page_size, 24), 1)
    product_count_subquery = (
        select(Product.shop_id.label("shop_id"), func.count(Product.id).label("product_count"))
        .where(Product.deleted_at.is_(None))
        .group_by(Product.shop_id)
        .subquery()
    )
    sold_subquery = (
        select(Product.shop_id.label("shop_id"), func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_count"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.shop_id)
        .subquery()
    )
    filters = [Shop.status == "active"]
    relevance = 0
    if query:
        filters.append(or_(Shop.name.ilike(f"%{query}%"), Shop.description.ilike(f"%{query}%")))
        relevance = case(
            (Shop.name.ilike(f"{query}%"), 3),
            (Shop.name.ilike(f"%{query}%"), 2),
            (Shop.description.ilike(f"%{query}%"), 1),
            else_=0,
        )
    total = int(db.scalar(select(func.count(Shop.id)).where(and_(*filters))) or 0)
    stmt = (
        select(Shop)
        .outerjoin(product_count_subquery, product_count_subquery.c.shop_id == Shop.id)
        .outerjoin(sold_subquery, sold_subquery.c.shop_id == Shop.id)
        .where(and_(*filters))
        .order_by(relevance.desc() if query else Shop.id.desc(), func.coalesce(sold_subquery.c.sold_count, 0).desc(), func.coalesce(product_count_subquery.c.product_count, 0).desc(), Shop.id.desc())
        .offset((safe_page - 1) * safe_page_size)
        .limit(safe_page_size)
    )
    items = db.scalars(stmt).all()
    return {"items": [_serialize_shop_for_search(db, shop) for shop in items], "meta": _meta(safe_page, safe_page_size, total)}


def search_products(db: Session, query: str, page: int, page_size: int,
                    category_id: int | None = None, shop_id: int | None = None,
                    min_price: float | None = None, max_price: float | None = None,
                    min_rating: int | None = None, sort: str | None = None,
                    search_type: str = "normal"):
    is_fallback = False
    ai_parsed = None
    product_ids = None

    if search_type == "ai" and query and query.strip():
        from app.services.ai_service import parse_intent, vector_store
        # Get category names from the database
        categories = db.scalars(select(Category.name)).all()
        ai_res = parse_intent(query, categories)
        ai_parsed = ai_res
        is_fallback = ai_res.get("is_fallback", False)
        
        # Override query parameters if parsed from intent
        query = ai_res.get("search_query") or query
        if ai_res.get("min_price") is not None:
            min_price = ai_res.get("min_price")
        if ai_res.get("max_price") is not None:
            max_price = ai_res.get("max_price")
        if ai_res.get("sort") is not None:
            sort = ai_res.get("sort")
            
        ai_cat_name = ai_res.get("category")
        if ai_cat_name:
            db_cat = db.scalar(
                select(Category)
                .join(Product, Product.category_id == Category.id)
                .where(Category.name.ilike(f"%{ai_cat_name}%"), Product.deleted_at.is_(None))
                .limit(1)
            )
            if db_cat:
                category_id = db_cat.id
            # Else: don't set category_id, let vector search find it by name/desc
                
        # Perform semantic query using the vector store
        product_ids = vector_store.query_similarity(query, k=50)

    res = _build_query(db, query, page, page_size,
                        category_id=category_id, shop_id=shop_id,
                        min_price=min_price, max_price=max_price, min_rating=min_rating, sort=sort,
                        product_ids=product_ids)
    res["is_fallback"] = is_fallback
    res["ai_parsed"] = ai_parsed
    return res


def search_marketplace(db: Session, query: str, page: int, page_size: int,
                       shop_page: int = 1, shop_page_size: int = 4,
                       category_id: int | None = None, shop_id: int | None = None,
                       min_price: float | None = None, max_price: float | None = None,
                       min_rating: int | None = None, sort: str | None = None,
                       search_type: str = "normal"):
    products = search_products(
        db,
        query=query,
        page=page,
        page_size=page_size,
        category_id=category_id,
        shop_id=shop_id,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort=sort,
        search_type=search_type
    )
    shops = {"items": [], "meta": _meta(max(shop_page, 1), max(min(shop_page_size, 24), 1), 0)}
    if query and shop_id is None:
        shops = search_shops(db, query, shop_page, shop_page_size)
    return {"shops": shops, "products": products}


def recommend_products(db: Session, page: int, page_size: int):
    # Mock: return newest products as recommendations
    return _build_query(db, "", page, page_size, sort="newest")


# Index status tracking
import logging
logger = logging.getLogger(__name__)

INDEX_STATUS = "idle"  # idle, indexing, ready, error

def init_search_index(db: Session):
    global INDEX_STATUS
    INDEX_STATUS = "indexing"
    try:
        logger.info("Initializing search index...")
        from app.services.ai_service import vector_store
        # Get all products that are not deleted
        products = db.scalars(select(Product).where(Product.deleted_at.is_(None))).all()
        for p in products:
            vector_store.add_product(p.id, p.name, p.description, p.category_id)
        INDEX_STATUS = "ready"
        logger.info(f"Search index initialized successfully with {len(products)} products.")
    except Exception as e:
        INDEX_STATUS = "error"
        logger.error(f"Error initializing search index: {e}")

