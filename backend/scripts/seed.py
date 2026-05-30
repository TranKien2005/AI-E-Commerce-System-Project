from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from itertools import islice
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.entities import (
    AuditLog,
    CartItem,
    Category,
    ChatbotConfig,
    Conversation,
    Message,
    Notification,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductImage,
    ProductVideo,
    Report,
    Review,
    SellerRequest,
    Shop,
    User,
)

TAXONOMY_URL = (
    "https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt"
)
DEFAULT_DATASET = "McAuley-Lab/Amazon-Reviews-2023"
DEFAULT_SPLIT = "full"
DEFAULT_PRODUCTS_PER_DOMAIN = 100
DEFAULT_REVIEW_LIMIT_PER_DOMAIN = 500
SEED_PASSWORD = "Seed@123"
SEEDED_EMAILS = [
    "admin@example.com",
    "buyer@example.com",
    *(f"seed-seller-{index}@example.com" for index in range(1, 6)),
]
DEFAULT_ROOT_DOMAINS = [
    "All_Beauty",
    "Beauty_and_Personal_Care",
    "Electronics",
    "Cell_Phones_and_Accessories",
    "Home_and_Kitchen",
    "Clothing_Shoes_and_Jewelry",
    "Sports_and_Outdoors",
    "Toys_and_Games",
    "Books",
]
AMAZON_ROOT_TO_GOOGLE = {
    "All_Beauty": "Health & Beauty",
    "Beauty_and_Personal_Care": "Health & Beauty",
    "Health_and_Household": "Health & Beauty",
    "Electronics": "Electronics",
    "Cell_Phones_and_Accessories": "Electronics",
    "Home_and_Kitchen": "Home & Garden",
    "Clothing_Shoes_and_Jewelry": "Apparel & Accessories",
    "Sports_and_Outdoors": "Sporting Goods",
    "Toys_and_Games": "Toys & Games",
    "Books": "Media > Books",
    "Grocery_and_Gourmet_Food": "Food, Beverages & Tobacco",
    "Video_Games": "Software > Video Game Software",
    "Automotive": "Vehicles & Parts",
}


@dataclass(frozen=True)
class ImportedImage:
    url: str
    variant: str
    source_size: str


@dataclass(frozen=True)
class ImportedVideo:
    title: str
    url: str
    source_user_id: str


@dataclass(frozen=True)
class ImportedProduct:
    source_id: str
    source_domain: str
    title: str
    description: str
    price: Decimal
    category_text: str
    images: list[ImportedImage]
    videos: list[ImportedVideo]
    attributes: dict[str, Any]


@dataclass(frozen=True)
class ImportedReview:
    source_review_id: str
    source_user_id: str
    product_source_id: str
    rating: int
    title: str
    text: str
    timestamp: datetime | None
    verified_purchase: bool
    helpful_votes: int


class CategoryMapper:
    def __init__(self, path_to_id: dict[str, int]) -> None:
        self.path_to_id = path_to_id

    def map_root_domain(self, source_domain: str) -> int | None:
        preferred_path = AMAZON_ROOT_TO_GOOGLE.get(source_domain, "Uncategorized")
        if preferred_path in self.path_to_id:
            return self.path_to_id[preferred_path]
        leaf = preferred_path.split(" > ")[-1]
        for path, category_id in self.path_to_id.items():
            if path.endswith(f"> {leaf}") or path == leaf:
                return category_id
        return self.path_to_id.get("Uncategorized")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed development data for the ecommerce backend."
    )
    parser.add_argument(
        "--import-products",
        action="store_true",
        help="Stream product metadata from Hugging Face and import catalog rows.",
    )
    parser.add_argument(
        "--import-reviews",
        action="store_true",
        help="Stream raw Amazon reviews for imported products and create buyer reviews/orders.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_PRODUCTS_PER_DOMAIN,
        help="Products per Amazon root domain.",
    )
    parser.add_argument(
        "--review-limit",
        type=int,
        default=DEFAULT_REVIEW_LIMIT_PER_DOMAIN,
        help="Maximum raw review rows to scan per Amazon root domain.",
    )
    parser.add_argument(
        "--dataset", default=DEFAULT_DATASET, help="Hugging Face dataset name."
    )
    parser.add_argument(
        "--domain",
        action="append",
        dest="domains",
        help="Amazon root domain to import, e.g. Electronics. Can be repeated.",
    )
    parser.add_argument(
        "--dataset-config",
        help="Single Hugging Face metadata config. Kept for backwards compatibility.",
    )
    parser.add_argument(
        "--split", default=DEFAULT_SPLIT, help="Dataset split to stream."
    )
    parser.add_argument(
        "--taxonomy-url", default=TAXONOMY_URL, help="Google Product Taxonomy URL."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete development seed data before seeding.",
    )
    parser.add_argument("--yes", action="store_true", help="Confirm destructive reset.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Load and normalize data without writing changes.",
    )
    parser.add_argument(
        "--trust-remote-code",
        action="store_true",
        help="Allow Hugging Face dataset loader custom code when required by the dataset.",
    )
    parser.add_argument(
        "--validate-images",
        action="store_true",
        help="Probe product image URLs and store only reachable image URLs during product import.",
    )
    parser.add_argument(
        "--validate-videos",
        action="store_true",
        help="Probe product video URLs and store only reachable video URLs during product import.",
    )
    parser.add_argument(
        "--prune-broken-images",
        action="store_true",
        help="Probe existing product image URLs in the database and delete unreachable rows.",
    )
    return parser.parse_args()


def selected_domains(args: argparse.Namespace) -> list[str]:
    if args.dataset_config:
        return [
            args.dataset_config.removeprefix("raw_meta_").removeprefix("raw_review_")
        ]
    return args.domains or DEFAULT_ROOT_DOMAINS


def metadata_config(domain: str) -> str:
    return domain if domain.startswith("raw_meta_") else f"raw_meta_{domain}"


def review_config(domain: str) -> str:
    return domain if domain.startswith("raw_review_") else f"raw_review_{domain}"


def upsert_user(
    db: Session, email: str, full_name: str, role: str, password: str = SEED_PASSWORD
) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.full_name = full_name
        user.role = role
        user.status = "active"
        user.password = get_password_hash(password)
        if not user.email_verified_at:
            user.email_verified_at = datetime.now(timezone.utc)
        return user

    user = User(
        email=email,
        password=get_password_hash(password),
        full_name=full_name,
        role=role,
        status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    return user


def upsert_shop(db: Session, owner_id: int, name: str, description: str) -> Shop:
    shop = db.scalar(select(Shop).where(Shop.name == name))
    if shop:
        shop.owner_id = owner_id
        shop.description = description
        shop.status = "active"
        return shop

    shop = Shop(owner_id=owner_id, name=name, description=description, status="active")
    db.add(shop)
    db.flush()
    return shop


def seed_core_users_and_shops(db: Session) -> list[Shop]:
    upsert_user(db, "admin@example.com", "Aeris Admin", "admin", "Admin@123")
    upsert_user(db, "buyer@example.com", "Aeris Buyer", "buyer", "Buyer@123")

    shops = []
    for index in range(1, 6):
        seller = upsert_user(
            db, f"seed-seller-{index}@example.com", f"Aeris Seller {index}", "seller"
        )
        shops.append(
            upsert_shop(
                db,
                seller.id,
                f"Amazon Seed Shop {index}",
                "Imported product catalog for integration testing.",
            )
        )
    return shops


def reset_seed_data(db: Session) -> None:
    for model in [
        ProductVideo,
        ProductImage,
        CartItem,
        Payment,
        OrderItem,
        Review,
        Report,
        Notification,
        Message,
        Conversation,
        ChatbotConfig,
        AuditLog,
        Order,
        SellerRequest,
        Product,
        Shop,
        User,
        Category,
    ]:
        db.execute(delete(model))
    db.flush()


def seed_taxonomy(db: Session, taxonomy_url: str) -> dict[str, int]:
    path_to_id: dict[str, int] = {}
    existing: dict[tuple[str, int | None], Category] = {
        (category.name, category.parent_id): category
        for category in db.scalars(select(Category)).all()
    }

    with urlopen(taxonomy_url, timeout=30) as response:
        lines = response.read().decode("utf-8").splitlines()

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or " - " not in line:
            continue

        _, path = line.split(" - ", 1)
        parent_id: int | None = None
        accumulated: list[str] = []
        for part in [segment.strip() for segment in path.split(">") if segment.strip()]:
            accumulated.append(part)
            key = (part, parent_id)
            category = existing.get(key)
            if not category:
                category = Category(name=part, parent_id=parent_id)
                db.add(category)
                db.flush()
                existing[key] = category
            parent_id = category.id
            path_to_id[" > ".join(accumulated)] = category.id

    uncategorized = existing.get(("Uncategorized", None))
    if not uncategorized:
        uncategorized = Category(name="Uncategorized", parent_id=None)
        db.add(uncategorized)
        db.flush()
    path_to_id["Uncategorized"] = uncategorized.id
    return path_to_id


def stream_amazon_rows(
    dataset: str, dataset_config: str, split: str, trust_remote_code: bool
) -> Any:
    from datasets import load_dataset

    return load_dataset(
        dataset,
        dataset_config,
        split=split,
        streaming=True,
        trust_remote_code=trust_remote_code,
    )


def stream_amazon_jsonl(dataset: str, relative_path: str) -> Any:
    url = f"https://huggingface.co/datasets/{dataset}/resolve/main/{relative_path}"
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=60) as response:
        for raw_line in response:
            line = raw_line.decode("utf-8").strip()
            if line:
                yield json.loads(line)


def metadata_jsonl_path(source_domain: str) -> str:
    return f"raw/meta_categories/meta_{source_domain}.jsonl"


def review_jsonl_path(source_domain: str) -> str:
    return f"raw/review_categories/{source_domain}.jsonl"


def normalize_product(
    row: dict[str, Any], index: int, source_domain: str
) -> ImportedProduct | None:
    title = clean_text(first_value(row, ["title", "name", "product_title"]))
    if not title:
        return None

    source_id = clean_text(
        first_value(row, ["parent_asin", "asin", "id"])
    ) or stable_hash(f"{source_domain}:{title}")
    description = build_description(row)
    category_text = build_category_text(row)
    price = parse_price(
        first_value(row, ["price", "average_price", "list_price"]), index
    )
    details = parse_details(row.get("details"))
    attributes = {
        "source": "amazon_reviews_2023",
        "source_id": source_id,
        "source_domain": source_domain,
        "source_category": category_text,
        "brand": clean_text(first_value(row, ["brand", "store"])),
        "store": clean_text(row.get("store")),
        "features": listify(row.get("features"))[:8],
        "rating": row.get("average_rating"),
        "rating_count": row.get("rating_number"),
        "details": details,
        "normalized_details": normalize_details(details),
    }

    return ImportedProduct(
        source_id=source_id,
        source_domain=source_domain,
        title=title[:255],
        description=description,
        price=price,
        category_text=category_text or source_domain.replace("_", " "),
        images=extract_images(row),
        videos=extract_videos(row),
        attributes={
            key: value
            for key, value in attributes.items()
            if value not in (None, "", [], {})
        },
    )


def collect_products(
    args: argparse.Namespace, source_domain: str
) -> list[ImportedProduct]:
    products: list[ImportedProduct] = []
    seen_source_ids: set[str] = set()
    try:
        rows = stream_amazon_rows(
            args.dataset,
            metadata_config(source_domain),
            args.split,
            args.trust_remote_code,
        )
        products = normalize_product_rows(
            rows, args.limit, source_domain, seen_source_ids
        )
    except Exception:
        try:
            rows = stream_amazon_jsonl(args.dataset, metadata_jsonl_path(source_domain))
            products = normalize_product_rows(
                rows, args.limit, source_domain, seen_source_ids
            )
        except Exception as direct_exc:
            raise RuntimeError(
                f"Could not stream Amazon product metadata for {source_domain}. "
                "Check network access, add --trust-remote-code if required, or override --domain."
            ) from direct_exc
    return products


def normalize_product_rows(
    rows: Any, limit: int, source_domain: str, seen_source_ids: set[str]
) -> list[ImportedProduct]:
    products: list[ImportedProduct] = []
    for index, row in enumerate(islice(rows, limit * 25), start=1):
        product = normalize_product(dict(row), index, source_domain)
        if not product or product.source_id in seen_source_ids:
            continue
        seen_source_ids.add(product.source_id)
        products.append(product)
        if len(products) >= limit:
            break
    return products


def import_products(
    db: Session,
    products: list[ImportedProduct],
    shops: list[Shop],
    mapper: CategoryMapper,
    validate_images: bool,
    validate_videos: bool,
) -> int:
    imported = 0
    skipped_images = 0
    skipped_videos = 0
    for index, imported_product in enumerate(products):
        existing = db.scalar(
            select(Product).where(
                Product.attributes["source_id"].as_string()
                == imported_product.source_id
            )
        )
        shop = shops[index % len(shops)]
        category_id = mapper.map_root_domain(imported_product.source_domain)
        stock = deterministic_stock(imported_product.source_id)

        if existing:
            product = existing
            product.shop_id = shop.id
            product.category_id = category_id
            product.name = imported_product.title
            product.description = imported_product.description
            product.price = imported_product.price
            product.stock = stock
            product.attributes = imported_product.attributes
            product.deleted_at = None
            db.execute(
                delete(ProductImage).where(ProductImage.product_id == product.id)
            )
            db.execute(
                delete(ProductVideo).where(ProductVideo.product_id == product.id)
            )
        else:
            product = Product(
                shop_id=shop.id,
                category_id=category_id,
                name=imported_product.title,
                description=imported_product.description,
                price=imported_product.price,
                stock=stock,
                attributes=imported_product.attributes,
            )
            db.add(product)
            db.flush()

        images = imported_product.images[:6]
        if validate_images:
            valid_images = []
            for image in images:
                if is_reachable_url(image.url, expected_prefix="image/"):
                    valid_images.append(image)
                else:
                    skipped_images += 1
            images = valid_images
        images = sorted(
            images,
            key=lambda image: (
                image.variant.upper() != "MAIN",
                image.source_size != "hi_res",
                image.source_size != "large",
            ),
        )
        for image_index, image in enumerate(images):
            db.add(
                ProductImage(
                    product_id=product.id,
                    url=image.url[:500],
                    is_primary=image_index == 0,
                    variant=image.variant[:50],
                    source_size=image.source_size[:20],
                )
            )

        videos = imported_product.videos[:4]
        if validate_videos:
            valid_videos = []
            for video in videos:
                if is_reachable_url(video.url):
                    valid_videos.append(video)
                else:
                    skipped_videos += 1
            videos = valid_videos
        for video in videos:
            db.add(
                ProductVideo(
                    product_id=product.id,
                    title=video.title[:255],
                    url=video.url[:500],
                    source_user_id=video.source_user_id[:255],
                )
            )
        imported += 1

    if validate_images:
        print(f"Image validation skipped unreachable URLs={skipped_images}.")
    if validate_videos:
        print(f"Video validation skipped unreachable URLs={skipped_videos}.")
    return imported


def normalize_review(row: dict[str, Any]) -> ImportedReview | None:
    product_source_id = clean_text(first_value(row, ["parent_asin", "asin"]))
    source_user_id = clean_text(row.get("user_id"))
    if not product_source_id or not source_user_id:
        return None
    try:
        rating = int(float(row.get("rating")))
    except (TypeError, ValueError):
        return None
    if rating < 1 or rating > 5:
        return None
    timestamp = parse_timestamp(first_value(row, ["timestamp", "sort_timestamp"]))
    title = clean_text(row.get("title"))[:255]
    text = clean_text(row.get("text"))
    if not text:
        text = title or "Imported Amazon review."
    source_review_id = stable_hash(
        f"{source_user_id}:{product_source_id}:{row.get('timestamp')}:{rating}:{title}:{text[:64]}"
    )
    helpful_votes = parse_int(first_value(row, ["helpful_vote", "helpful_votes"]), 0)
    return ImportedReview(
        source_review_id=source_review_id,
        source_user_id=source_user_id,
        product_source_id=product_source_id,
        rating=rating,
        title=title,
        text=text,
        timestamp=timestamp,
        verified_purchase=bool(row.get("verified_purchase")),
        helpful_votes=helpful_votes,
    )


def import_reviews_for_domain(
    db: Session, args: argparse.Namespace, source_domain: str
) -> tuple[int, int, int]:
    product_by_source_id = {
        product.attributes.get("source_id"): product
        for product in db.scalars(
            select(Product).where(
                Product.attributes["source_domain"].as_string() == source_domain
            )
        ).all()
        if product.attributes.get("source_id")
    }
    if not product_by_source_id:
        return 0, 0, 0

    imported_reviews = 0
    created_users = 0
    created_orders = 0
    try:
        try:
            rows = stream_amazon_rows(
                args.dataset,
                review_config(source_domain),
                args.split,
                args.trust_remote_code,
            )
            import_reviews, users, orders = import_review_rows(
                db, rows, args.review_limit, product_by_source_id
            )
        except Exception:
            rows = stream_amazon_jsonl(args.dataset, review_jsonl_path(source_domain))
            import_reviews, users, orders = import_review_rows(
                db, rows, args.review_limit, product_by_source_id
            )
        imported_reviews += import_reviews
        created_users += users
        created_orders += orders
    except Exception as exc:
        raise RuntimeError(
            f"Could not stream Amazon raw reviews for {source_domain}."
        ) from exc
    return imported_reviews, created_users, created_orders


def import_review_rows(
    db: Session, rows: Any, review_limit: int, product_by_source_id: dict[str, Product]
) -> tuple[int, int, int]:
    imported_reviews = 0
    created_users = 0
    created_orders = 0
    scanned = 0
    for row in rows:
        scanned += 1
        if scanned > 100000:
            break
        review = normalize_review(dict(row))
        if not review or review.product_source_id not in product_by_source_id:
            continue
        if db.scalar(
            select(Review).where(Review.source_review_id == review.source_review_id)
        ):
            continue
        product = product_by_source_id[review.product_source_id]
        user, user_created = upsert_seed_buyer(db, review.source_user_id)
        created_users += int(user_created)
        db_review = Review(
            user_id=user.id,
            product_id=product.id,
            rating=review.rating,
            comment=review.text,
            title=review.title,
            verified_purchase=review.verified_purchase,
            helpful_votes=review.helpful_votes,
            source_user_id=review.source_user_id,
            source_review_id=review.source_review_id,
        )
        if review.timestamp:
            db_review.created_at = review.timestamp
        db.add(db_review)
        imported_reviews += 1
        if review.verified_purchase:
            create_seed_order(db, user, product, review)
            created_orders += 1
        if imported_reviews >= review_limit:
            break
    return imported_reviews, created_users, created_orders


def upsert_seed_buyer(db: Session, source_user_id: str) -> tuple[User, bool]:
    suffix = stable_hash(source_user_id)[:10]
    email = f"amazon-buyer-{suffix}@example.com"
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user, False
    user = User(
        email=email,
        password=get_password_hash(SEED_PASSWORD),
        full_name=f"Amazon Buyer {suffix[:5].upper()}",
        role="buyer",
        status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    return user, True


def create_seed_order(
    db: Session, user: User, product: Product, review: ImportedReview
) -> None:
    quantity = 1 + int(stable_hash(review.source_review_id), 16) % 2
    total = Decimal(product.price) * quantity
    order = Order(
        user_id=user.id,
        total_price=total,
        status="delivered",
        payment_status="paid",
        shipping_address=random_shipping_address(review.source_user_id),
        shipping_status="delivered",
        shipping_note="Imported from verified Amazon review signal.",
    )
    if review.timestamp:
        order.created_at = review.timestamp
    db.add(order)
    db.flush()
    db.add(
        OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            price=product.price,
        )
    )
    db.add(
        Payment(
            order_id=order.id,
            method="ONLINE",
            status="paid",
            transaction_id=f"seed-{review.source_review_id}",
            idempotency_key=f"seed-{review.source_review_id}",
        )
    )


def first_value(row: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        value = " ".join(str(item) for item in value if item)
    return re.sub(r"\s+", " ", str(value)).strip()


def listify(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [clean_text(item) for item in value if clean_text(item)]
    if isinstance(value, dict):
        return [clean_text(item) for item in value.values() if clean_text(item)]
    text = clean_text(value)
    return [text] if text else []


def build_description(row: dict[str, Any]) -> str:
    parts = []
    for key in ["description", "features"]:
        parts.extend(listify(row.get(key)))
    if not parts:
        parts.append(
            "Product imported from public Amazon Reviews 2023 metadata for catalog integration testing."
        )
    return "\n".join(parts[:8])


def build_category_text(row: dict[str, Any]) -> str:
    categories = (
        row.get("categories") or row.get("category") or row.get("main_category")
    )
    if isinstance(categories, list):
        flattened = []
        for item in categories:
            if isinstance(item, list):
                flattened.extend(clean_text(part) for part in item)
            else:
                flattened.append(clean_text(item))
        return " > ".join(part for part in flattened if part)
    return clean_text(categories)


def parse_price(value: Any, index: int) -> Decimal:
    text = clean_text(value).replace("$", "").replace(",", "")
    try:
        price = Decimal(text)
        if price > 0:
            return price.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        pass
    fallback = Decimal(9 + (index % 90) * 3)
    return fallback.quantize(Decimal("0.01"))


def parse_details(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return {
            clean_text(key): clean_text(val)
            for key, val in value.items()
            if clean_text(key) and clean_text(val)
        }
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return {
                    clean_text(key): clean_text(val)
                    for key, val in parsed.items()
                    if clean_text(key) and clean_text(val)
                }
        except json.JSONDecodeError:
            return {"raw": clean_text(value)}
    return {}


def normalize_details(details: dict[str, Any]) -> dict[str, str]:
    aliases = {
        "brand": ("brand", "brand name"),
        "manufacturer": ("manufacturer",),
        "model": ("model", "item model number", "model number"),
        "color": ("color", "colour"),
        "size": ("size",),
        "material": ("material", "material type"),
        "dimensions": ("dimensions", "product dimensions", "item dimensions"),
        "weight": ("weight", "item weight"),
    }
    normalized_keys = {
        re.sub(r"[^a-z0-9]+", " ", key.lower()).strip(): clean_text(value)
        for key, value in details.items()
    }
    output: dict[str, str] = {}
    for target, keys in aliases.items():
        for key in keys:
            if key in normalized_keys and normalized_keys[key]:
                output[target] = normalized_keys[key]
                break
    return output


def image_urls_from_text(value: str) -> list[str]:
    return re.findall(r"https?://\S+", clean_text(value))


def extract_images(row: dict[str, Any]) -> list[ImportedImage]:
    images: list[ImportedImage] = []
    collect_images(row.get("images"), images)
    for key in ["image", "main_image", "large", "hi_res"]:
        value = row.get(key)
        if isinstance(value, str):
            images.extend(
                ImportedImage(url=url, variant="", source_size=key)
                for url in image_urls_from_text(value)
            )
    seen = set()
    unique = []
    for image in images:
        if image.url.startswith("http") and image.url not in seen:
            unique.append(image)
            seen.add(image.url)
    return unique


def collect_images(value: Any, images: list[ImportedImage]) -> None:
    if value is None:
        return
    if isinstance(value, list):
        for item in value:
            collect_images(item, images)
        return
    if isinstance(value, dict):
        variant = clean_text(value.get("variant"))
        for source_size in ["hi_res", "large", "thumb", "main", "url"]:
            url = clean_text(value.get(source_size))
            for image_url in image_urls_from_text(url):
                images.append(
                    ImportedImage(
                        url=image_url, variant=variant, source_size=source_size
                    )
                )


def extract_videos(row: dict[str, Any]) -> list[ImportedVideo]:
    videos = []
    for item in row.get("videos") or []:
        if not isinstance(item, dict):
            continue
        url = clean_text(item.get("url"))
        if url.startswith("http"):
            videos.append(
                ImportedVideo(
                    title=clean_text(item.get("title")),
                    url=url,
                    source_user_id=clean_text(item.get("user_id")),
                )
            )
    return videos


def is_reachable_url(url: str, expected_prefix: str | None = None) -> bool:
    request = Request(
        url, method="GET", headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=0-0"}
    )
    try:
        with urlopen(request, timeout=8) as response:
            content_type = response.headers.get("content-type", "")
            if expected_prefix and not content_type.startswith(expected_prefix):
                return False
            return response.status in (200, 206)
    except (HTTPError, URLError, OSError):
        return False


def stable_hash(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:16]


def deterministic_stock(source_id: str) -> int:
    digest = int(stable_hash(source_id), 16)
    return 5 + digest % 96


def parse_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_timestamp(value: Any) -> datetime | None:
    try:
        timestamp = int(value)
    except (TypeError, ValueError):
        return None
    if timestamp > 10_000_000_000:
        timestamp //= 1000
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def random_shipping_address(seed_value: str) -> str:
    cities = [
        "HÃ  Ná»™i",
        "TP. Há»“ ChÃ­ Minh",
        "ÄÃ  Náºµng",
        "Cáº§n ThÆ¡",
        "Háº£i PhÃ²ng",
    ]
    streets = [
        "Nguyá»…n TrÃ£i",
        "LÃª Lá»£i",
        "Tráº§n HÆ°ng Äáº¡o",
        "Hai BÃ  TrÆ°ng",
        "Phan Chu Trinh",
    ]
    digest = int(stable_hash(seed_value), 16)
    return f"{10 + digest % 190} {streets[digest % len(streets)]}, {cities[(digest // 7) % len(cities)]}"


def print_counts(db: Session, prefix: str) -> None:
    counts = {
        "categories": db.scalar(select(func.count()).select_from(Category)),
        "shops": db.scalar(select(func.count()).select_from(Shop)),
        "products": db.scalar(select(func.count()).select_from(Product)),
        "product_images": db.scalar(select(func.count()).select_from(ProductImage)),
        "product_videos": db.scalar(select(func.count()).select_from(ProductVideo)),
        "users": db.scalar(select(func.count()).select_from(User)),
        "reviews": db.scalar(select(func.count()).select_from(Review)),
        "orders": db.scalar(select(func.count()).select_from(Order)),
    }
    print(f"{prefix}: " + ", ".join(f"{key}={value}" for key, value in counts.items()))


def prune_broken_images(db: Session) -> tuple[int, int]:
    images = db.scalars(select(ProductImage)).all()
    kept = 0
    removed = 0
    for image in images:
        if is_reachable_url(image.url, expected_prefix="image/"):
            kept += 1
        else:
            db.delete(image)
            removed += 1
    db.flush()
    return kept, removed


def run(args: argparse.Namespace) -> None:
    if args.reset and not args.yes:
        raise SystemExit(
            "Refusing to reset database without --yes. Re-run with --reset --yes if this is intentional."
        )

    db = SessionLocal()
    try:
        domains = selected_domains(args)
        if args.dry_run:
            for domain in domains:
                products = (
                    collect_products(args, domain) if args.import_products else []
                )
                print(
                    f"Dry run: collected {len(products)} products from {args.dataset}/{metadata_config(domain)}:{args.split}."
                )
                for product in products[:5]:
                    print(
                        f"- {domain} | {product.title} | {product.price} | images={len(product.images)} | videos={len(product.videos)} | details={len(product.attributes.get('details', {}))}"
                    )
            return

        if args.reset:
            print(
                "Reset confirmed. Deleting development database rows before seeding..."
            )
            reset_seed_data(db)

        if args.prune_broken_images:
            kept, removed = prune_broken_images(db)
            db.commit()
            print(f"Image validation completed. kept={kept}, removed={removed}.")
            print_counts(db, "Current counts")
            return

        shops = seed_core_users_and_shops(db)
        path_to_id = seed_taxonomy(db, args.taxonomy_url)
        mapper = CategoryMapper(path_to_id)
        imported = 0
        if args.import_products:
            for domain in domains:
                products = collect_products(args, domain)
                domain_imported = import_products(
                    db,
                    products,
                    shops,
                    mapper,
                    args.validate_images,
                    args.validate_videos,
                )
                imported += domain_imported
                print(
                    f"Imported domain {domain}: products={domain_imported}/{args.limit}"
                )

        review_total = 0
        user_total = 0
        order_total = 0
        if args.import_reviews:
            for domain in domains:
                reviews, users, orders = import_reviews_for_domain(db, args, domain)
                review_total += reviews
                user_total += users
                order_total += orders
                print(
                    f"Imported reviews for {domain}: reviews={reviews}, users={users}, orders={orders}"
                )

        db.commit()
        print(
            f"Seed completed. Imported products={imported}, reviews={review_total}, users={user_total}, orders={order_total}."
        )
        print_counts(db, "Current counts")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run(parse_args())
