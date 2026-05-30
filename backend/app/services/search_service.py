"""Catalog and marketplace search helpers for buyer-facing product/shop discovery."""

from app.models.entities import Shop, Product, OrderItem, Category, Review, ProductImage
import logging
import re
from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_IMAGE_URL_RE = re.compile(r"https?://\S+")


def sanitize_image_url(value: str | None) -> str | None:
    """Extract the first HTTP(S) URL from imported image fields."""
    if not value:
        return None
    match = _IMAGE_URL_RE.search(value.strip())
    return match.group(0) if match else None


def _product_metrics(db: Session, product_id: int) -> tuple[float | None, int, int]:
    """Calculate rating, review count, and sold count for listing cards."""
    rating_row = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.product_id == product_id
        )
    ).one()
    sold_count = (
        db.scalar(
            select(func.coalesce(func.sum(OrderItem.quantity), 0)).where(
                OrderItem.product_id == product_id
            )
        )
        or 0
    )
    avg_rating = round(float(rating_row[0]), 1) if rating_row[0] is not None else None
    return avg_rating, int(rating_row[1] or 0), int(sold_count)


# Trạng thái toàn cục của tiến trình đánh chỉ mục Vector AI
INDEX_STATUS = "idle"  # Các giá trị hợp lệ: idle, indexing, ready, error


def _meta(page: int, page_size: int, total: int) -> dict:
    """Cấu trúc hóa metadata phân trang toàn hệ thống.

    Args:
        page: Số thứ tự trang hiện tại.
        page_size: Số lượng phần tử trên một trang.
        total: Tổng số bản ghi tìm thấy trong DB.

    Returns:
        Một dict chứa thông tin phân trang tiêu chuẩn.
    """
    total_pages = (total + page_size - 1) // page_size if page_size else 1
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


def _serialize_product_for_buyer(db: Session, product) -> dict:
    """Tuần tự hóa dữ liệu sản phẩm phù hợp với góc nhìn của người mua.

    Args:
        db: Phiên làm việc với cơ sở dữ liệu.
        product: Đối tượng ORM Product cần chuyển đổi.

    Returns:
        Một dict chứa thông tin sản phẩm đã làm sạch.
    """
    return _serialize_products_for_buyer(db, [product])[0]


def _serialize_products_for_buyer(db: Session, products: list[Product]) -> list[dict]:
    if not products:
        return []

    product_ids = [product.id for product in products]
    shop_ids = {product.shop_id for product in products if product.shop_id is not None}
    category_ids = {
        product.category_id for product in products if product.category_id is not None
    }

    shops = (
        {
            shop.id: shop
            for shop in db.scalars(
                select(Shop).where(Shop.id.in_(list(shop_ids)))
            ).all()
        }
        if shop_ids
        else {}
    )
    categories = (
        {
            category.id: category
            for category in db.scalars(
                select(Category).where(Category.id.in_(list(category_ids)))
            ).all()
        }
        if category_ids
        else {}
    )

    image_by_product: dict[int, str] = {}
    image_rows = db.execute(
        select(ProductImage.product_id, ProductImage.url)
        .where(ProductImage.product_id.in_(product_ids))
        .order_by(
            ProductImage.product_id.asc(),
            ProductImage.is_primary.desc(),
            ProductImage.id.asc(),
        )
    ).all()
    for product_id, url in image_rows:
        if product_id in image_by_product:
            continue
        clean_url = sanitize_image_url(url)
        if clean_url:
            image_by_product[product_id] = clean_url

    rating_rows = db.execute(
        select(Review.product_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.product_id.in_(product_ids))
        .group_by(Review.product_id)
    ).all()
    rating_by_product = {
        product_id: (
            round(float(avg_rating), 1) if avg_rating is not None else None,
            int(review_count or 0),
        )
        for product_id, avg_rating, review_count in rating_rows
    }

    sold_rows = db.execute(
        select(OrderItem.product_id, func.coalesce(func.sum(OrderItem.quantity), 0))
        .where(OrderItem.product_id.in_(product_ids))
        .group_by(OrderItem.product_id)
    ).all()
    sold_by_product = {
        product_id: int(sold_count or 0) for product_id, sold_count in sold_rows
    }

    items = []
    for product in products:
        shop = shops.get(product.shop_id)
        category = categories.get(product.category_id) if product.category_id else None
        avg_rating, review_count = rating_by_product.get(product.id, (None, 0))
        items.append(
            {
                "id": product.id,
                "name": product.name,
                "price": float(product.price),
                "description": product.description,
                "stock": product.stock,
                "primary_image": image_by_product.get(product.id),
                "shop_id": product.shop_id,
                "shop_name": shop.name if shop else None,
                "category_id": product.category_id,
                "category": {"id": category.id, "name": category.name}
                if category
                else None,
                "avg_rating": avg_rating,
                "review_count": review_count,
                "sold_count": sold_by_product.get(product.id, 0),
            }
        )
    return items


def _serialize_shop_for_search(db: Session, shop) -> dict:
    """Tuần tự hóa dữ liệu cửa hàng phục vụ cho tính năng hiển thị tìm kiếm.

    Args:
        db: Phiên làm việc với cơ sở dữ liệu.
        shop: Đối tượng ORM Shop cần chuyển đổi.

    Returns:
        Một dict chứa thông tin cửa hàng đã làm sạch.
    """
    return {
        "id": shop.id,
        "name": shop.name,
        "status": shop.status,
        "description": shop.description,
    }


# ==========================================
# CENTRALIZED SUBQUERIES FOR SCOPE RESOLUTION
# ==========================================

# Khai báo cấu trúc Subquery toàn cục hoặc tái sử dụng trong các helper
# Để tránh lỗi scope khi viết hàm độc lập.
rating_subquery = (
    select(
        Product.id.label("product_id"),
        func.avg(Review.rating).label(
            "avg_rating"
        ),  # Giả định có model Review tương ứng
    )
    .join(Review, Review.product_id == Product.id)
    .group_by(Product.id)
    .subquery()
)

sold_subquery = (
    select(
        OrderItem.product_id.label("product_id"),
        func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_count"),
    )
    .group_by(OrderItem.product_id)
    .subquery()
)

# ==========================================
# INTERNAL QUERY BUILDER HELPERS (HÀM BỔ TRỢ)
# ==========================================


def _apply_product_filters(
    query: str,
    category_id: int | None,
    shop_id: int | None,
    min_price: float | None,
    max_price: float | None,
    min_rating: int | None,
    product_ids: list[int] | None,
) -> list:
    """Xây dựng danh sách các biểu thức điều kiện lọc (WHERE) cho Sản phẩm.

    Ưu tiên áp dụng kết quả tìm kiếm vector từ AI hơn là khớp chuỗi ký tự thông thường.

    Args:
        query: Chuỗi văn bản tìm kiếm do người dùng nhập.
        category_id: ID của danh mục sản phẩm cần lọc.
        shop_id: ID của cửa hàng cần lọc sản phẩm.
        min_price: Giá bán tối thiểu.
        max_price: Giá bán tối đa.
        min_rating: Điểm đánh giá trung bình tối thiểu từ khách hàng.
        product_ids: Danh sách ID sản phẩm do AI gợi ý dựa trên độ tương đồng ngữ nghĩa.

    Returns:
        Một danh sách chứa các điều kiện lọc của SQLAlchemy.
    """
    # Điều kiện bắt buộc: Chỉ lấy sản phẩm chưa bị xóa (Soft-delete)
    filters = [Product.deleted_at.is_(None)]

    if product_ids is not None:
        filters.append(Product.id.in_(product_ids))
    elif query:
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

    return filters


def _apply_product_sorting(stmt, sort: str | None, product_ids: list[int] | None):
    """Áp dụng các mệnh đề sắp xếp (ORDER BY) vào câu lệnh truy vấn sản phẩm.

    Args:
        stmt: Đối tượng truy vấn SQLAlchemy (`select`) hiện tại của Sản phẩm.
        sort: Định danh thuật toán sắp xếp (ví dụ: 'price_asc', 'top_sales').
        product_ids: Danh sách ID sản phẩm được sắp xếp theo độ tương đồng từ AI.

    Returns:
        Đối tượng truy vấn SQLAlchemy đã được thêm mệnh đề ORDER BY.
    """
    # Áp dụng cấu trúc ánh xạ (Mapping) với độ phức tạp O(1) thay cho chuỗi if-else
    sort_mapping = {
        "price_asc": (Product.price.asc(), Product.id.desc()),
        "price_desc": (Product.price.desc(), Product.id.desc()),
        "top_sales": (
            func.coalesce(sold_subquery.c.sold_count, 0).desc(),
            Product.id.desc(),
        ),
        "popular": (
            func.coalesce(sold_subquery.c.sold_count, 0).desc(),
            Product.id.desc(),
        ),
        "newest": (Product.id.desc(),),
    }

    if sort in sort_mapping:
        return stmt.order_by(*sort_mapping[sort])

    # Giữ nguyên thứ tự ưu tiên ngữ nghĩa (Cosine Similarity) do Vector Store trả về
    if product_ids:
        whens = {pid: i for i, pid in enumerate(product_ids)}
        return stmt.order_by(case(whens, value=Product.id))

    return stmt.order_by(Product.id.desc())


def _build_query(
    db: Session,
    query: str,
    page: int,
    page_size: int,
    category_id: int | None = None,
    shop_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: int | None = None,
    sort: str | None = None,
    product_ids: list[int] | None = None,
):
    """Khởi tạo cấu trúc truy vấn SQL, tính toán phân trang và tuần tự hóa dữ liệu.

    Args:
        db: Phiên làm việc (Session) kết nối với Cơ sở dữ liệu.
        query: Chuỗi văn bản tìm kiếm gốc.
        page: Số thứ tự trang hiện tại cần lấy dữ liệu.
        page_size: Số lượng bản ghi tối đa trên một trang.
        category_id: ID danh mục sản phẩm (Tùy chọn).
        shop_id: ID cửa hàng (Tùy chọn).
        min_price: Giá bán thấp nhất (Tùy chọn).
        max_price: Giá bán cao nhất (Tùy chọn).
        min_rating: Đánh giá sao tối thiểu (Tùy chọn).
        sort: Tiêu chí sắp xếp sản phẩm (Tùy chọn).
        product_ids: Tập hợp ID sản phẩm lọc trước từ AI (Tùy chọn).

    Returns:
        Một dict chứa danh sách sản phẩm đã được format và thông tin phân trang (meta).
    """
    # Giới hạn biên an toàn cho phân trang nhằm ngăn lỗi giá trị âm hoặc quá tải DB
    safe_page = max(page, 1)
    safe_page_size = max(min(page_size, 100), 1)

    filters = _apply_product_filters(
        query, category_id, shop_id, min_price, max_price, min_rating, product_ids
    )

    # Tách biệt câu lệnh lấy dữ liệu và câu lệnh đếm tổng để tối ưu tốc độ hàm COUNT
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

    stmt = _apply_product_sorting(stmt, sort, product_ids)

    total = int(db.scalar(total_stmt) or 0)
    offset = (safe_page - 1) * safe_page_size
    items = db.scalars(stmt.offset(offset).limit(safe_page_size)).all()

    return {
        "items": _serialize_products_for_buyer(db, items),
        "meta": _meta(safe_page, safe_page_size, total),
    }


# ==========================================
# PUBLIC APIS (CÁC ĐẦU HÀM XUẤT RA NGOÀI)
# ==========================================


def search_shops(db: Session, query: str, page: int, page_size: int):
    """Tìm kiếm các cửa hàng đang hoạt động dựa trên trọng số văn bản và lượng bán.

    Args:
        db: Phiên làm việc (Session) kết nối với Cơ sở dữ liệu.
        query: Từ khóa tìm kiếm tên hoặc mô tả cửa hàng.
        page: Số thứ tự trang hiện tại.
        page_size: Số lượng cửa hàng tối đa trên một trang.

    Returns:
        Một dict chứa thông tin danh sách cửa hàng tìm thấy và metadata phân trang.
    """
    safe_page = max(page, 1)
    safe_page_size = max(min(page_size, 24), 1)

    # Subquery: Thống kê số lượng sản phẩm hiện có của từng cửa hàng
    product_count_subquery = (
        select(
            Product.shop_id.label("shop_id"),
            func.count(Product.id).label("product_count"),
        )
        .where(Product.deleted_at.is_(None))
        .group_by(Product.shop_id)
        .subquery()
    )

    # Subquery: Tổng hợp tích lũy số lượng mặt hàng đã bán ra của từng cửa hàng
    sold_subquery_shop = (
        select(
            Product.shop_id.label("shop_id"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_count"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.shop_id)
        .subquery()
    )

    filters = [Shop.status == "active"]
    relevance = 0

    # Tính điểm liên quan: Khớp tiền tố (3) > Khớp chuỗi con (2) > Khớp mô tả (1)
    if query:
        filters.append(
            or_(Shop.name.ilike(f"%{query}%"), Shop.description.ilike(f"%{query}%"))
        )
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
        .outerjoin(sold_subquery_shop, sold_subquery_shop.c.shop_id == Shop.id)
        .where(and_(*filters))
        .order_by(
            relevance.desc() if query else Shop.id.desc(),
            func.coalesce(sold_subquery_shop.c.sold_count, 0).desc(),
            func.coalesce(product_count_subquery.c.product_count, 0).desc(),
            Shop.id.desc(),
        )
        .offset((safe_page - 1) * safe_page_size)
        .limit(safe_page_size)
    )

    items = db.scalars(stmt).all()
    return {
        "items": [_serialize_shop_for_search(db, shop) for shop in items],
        "meta": _meta(safe_page, safe_page_size, total),
    }


async def search_products(
    db: Session,
    query: str,
    page: int,
    page_size: int,
    category_id: int | None = None,
    shop_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: int | None = None,
    sort: str | None = None,
    search_type: str = "normal",
):
    """Điều phối tìm kiếm sản phẩm thông qua bộ lọc SQL truyền thống hoặc Vector Search AI.

    Args:
        db: Phiên làm việc (Session) kết nối với Cơ sở dữ liệu.
        query: Câu lệnh truy vấn văn bản từ người dùng (hoặc câu lệnh prompt cho AI).
        page: Trang hiện tại.
        page_size: Kích thước trang dữ liệu.
        category_id: Khóa chính danh mục để lọc sản phẩm (Tùy chọn).
        shop_id: Khóa chính shop để lọc sản phẩm thuộc shop (Tùy chọn).
        min_price: Giá sàn (Tùy chọn).
        max_price: Giá trần (Tùy chọn).
        min_rating: Số sao đánh giá tối thiểu (Tùy chọn).
        sort: Thuộc tính sắp xếp kết quả trả về (Tùy chọn).
        search_type: Chế độ tìm kiếm, nhận giá trị 'normal' hoặc 'ai'.

    Returns:
        Mạng dữ liệu kết quả tìm kiếm kèm theo các biến trạng thái phân tích ngữ nghĩa AI.
    """
    is_fallback = False
    ai_parsed = None
    product_ids = None

    if search_type == "ai" and query and query.strip():
        from app.services.ai_service import parse_intent, vector_store

        # Cung cấp danh sách ngữ cảnh Category giúp mô hình AI phân tách ý định chính xác
        categories = db.scalars(select(Category.name)).all()
        ai_res = await parse_intent(query, categories)
        ai_parsed = ai_res
        is_fallback = ai_res.get("is_fallback", False)

        # Ghi đè các tiêu chí tìm kiếm bằng các thực thể (entities) bóc tách được từ AI
        query = ai_res.get("search_query") or query
        if ai_res.get("min_price") is not None:
            min_price = ai_res.get("min_price")
        if ai_res.get("max_price") is not None:
            max_price = ai_res.get("max_price")
        if ai_res.get("sort") is not None:
            sort = ai_res.get("sort")

        # Ánh xạ ngược chuỗi tên danh mục mà AI phân tích về ID khóa chính trong DB
        ai_cat_name = ai_res.get("category")
        if ai_cat_name:
            db_cat = db.scalar(
                select(Category)
                .join(Product, Product.category_id == Category.id)
                .where(
                    Category.name.ilike(f"%{ai_cat_name}%"),
                    Product.deleted_at.is_(None),
                )
                .limit(1)
            )
            if db_cat:
                category_id = db_cat.id

        # Thực hiện truy vấn không gian Vector tìm Top-K sản phẩm tương đồng về mặt ngữ nghĩa
        product_ids = await vector_store.query_similarity(query, k=50)

    res = _build_query(
        db,
        query,
        page,
        page_size,
        category_id=category_id,
        shop_id=shop_id,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort=sort,
        product_ids=product_ids,
    )

    res["is_fallback"] = is_fallback
    res["ai_parsed"] = ai_parsed
    return res


async def search_marketplace(
    db: Session,
    query: str,
    page: int,
    page_size: int,
    shop_page: int = 1,
    shop_page_size: int = 4,
    category_id: int | None = None,
    shop_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: int | None = None,
    sort: str | None = None,
    search_type: str = "normal",
):
    """Cung cấp cổng tìm kiếm hỗn hợp trả về cả dữ liệu Sản phẩm lẫn Cửa hàng liên quan.

    Args:
        db: Phiên làm việc (Session) kết nối với Cơ sở dữ liệu.
        query: Từ khóa tìm kiếm tổng hợp.
        page: Số trang cho danh mục sản phẩm.
        page_size: Số sản phẩm tối đa trên trang.
        shop_page: Số trang riêng cho kết quả tìm kiếm shop.
        shop_page_size: Số lượng shop tối đa hiển thị trên luồng danh sách.
        category_id: ID danh mục để lọc sản phẩm (Tùy chọn).
        shop_id: ID shop cụ thể để lọc sản phẩm (Tùy chọn).
        min_price: Giá sản phẩm thấp nhất (Tùy chọn).
        max_price: Giá sản phẩm cao nhất (Tùy chọn).
        min_rating: Số sao tối thiểu (Tùy chọn).
        sort: Quy trình xếp thứ tự sản phẩm (Tùy chọn).
        search_type: Chế độ tìm kiếm ('normal' hoặc 'ai').

    Returns:
        Một dict tổng hợp chứa hai nhánh kết quả độc lập: 'shops' và 'products'.
    """
    products = await search_products(
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
        search_type=search_type,
    )

    shops = {
        "items": [],
        "meta": _meta(max(shop_page, 1), max(min(shop_page_size, 24), 1), 0),
    }

    # Ngăn chặn việc truy vấn tìm kiếm shop ngầm nếu client đang giới hạn trong một shop cụ thể
    if query and shop_id is None:
        shops = search_shops(db, query, shop_page, shop_page_size)

    return {"shops": shops, "products": products}


def recommend_products(db: Session, page: int, page_size: int):
    """Xây dựng danh sách sản phẩm gợi ý cá nhân hóa cho người dùng.

    Args:
        db: Phiên làm việc (Session) kết nối với Cơ sở dữ liệu.
        page: Số thứ tự trang dữ liệu gợi ý.
        page_size: Số lượng phần tử hiển thị trên một trang.

    Returns:
        Cấu trúc dữ liệu danh sách sản phẩm (Tạm thời lấy sản phẩm mới nhất làm fallback).
    """
    return _build_query(db, "", page, page_size, sort="newest")


def init_search_index(db: Session):
    """Nạp và đồng bộ toàn bộ dữ liệu văn bản từ RDBMS vào kho lưu trữ Vector của dịch vụ AI.

    Args:
        db: Phiên làm việc (Session) dùng để trích xuất dữ liệu thô từ cơ sở dữ liệu.
    """
    global INDEX_STATUS
    INDEX_STATUS = "indexing"
    try:
        logger.info("Initializing search index...")
        from app.services.ai_service import vector_store

        # Chỉ lập chỉ mục các sản phẩm đang hiển thị (chưa soft-delete)
        products = db.scalars(select(Product).where(Product.deleted_at.is_(None))).all()

        import asyncio

        async def index_all():
            for p in products:
                await vector_store.add_product(
                    p.id, p.name, p.description, p.category_id
                )

        asyncio.run(index_all())

        INDEX_STATUS = "ready"
        logger.info(
            f"Search index initialized successfully with {len(products)} products."
        )
    except Exception as e:
        INDEX_STATUS = "error"
        logger.error(f"Error initializing search index: {e}")
