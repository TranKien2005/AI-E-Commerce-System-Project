from __future__ import annotations

import argparse
import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import get_close_matches
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
    Report,
    Review,
    SellerRequest,
    Shop,
    User,
)

TAXONOMY_URL = "https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt"
DEFAULT_DATASET = "McAuley-Lab/Amazon-Reviews-2023"
DEFAULT_DATASET_CONFIG = "raw_meta_All_Beauty"
DEFAULT_SPLIT = "full"
SEED_PASSWORD = "Seed@123"
SEEDED_EMAILS = ["admin@example.com", "buyer@example.com", *(f"seed-seller-{index}@example.com" for index in range(1, 6))]


@dataclass(frozen=True)
class ImportedProduct:
    source_id: str
    title: str
    description: str
    price: Decimal
    category_text: str
    image_urls: list[str]
    attributes: dict[str, Any]


class CategoryMapper:
    def __init__(self, path_to_id: dict[str, int]) -> None:
        self.path_to_id = path_to_id
        self.normalized_paths = {self._normalize(path): path for path in path_to_id}
        self.rules = [
            (("phone", "cell phone", "smartphone", "mobile"), "Electronics > Communications > Telephony > Mobile Phones"),
            (("laptop", "notebook computer"), "Electronics > Computers > Laptops"),
            (("computer", "pc", "monitor", "keyboard", "mouse"), "Electronics > Computers"),
            (("camera", "photo", "video"), "Cameras & Optics > Cameras"),
            (("headphone", "earbud", "speaker", "audio"), "Electronics > Audio"),
            (("shoe", "sneaker", "boot", "sandal"), "Apparel & Accessories > Shoes"),
            (("shirt", "dress", "jacket", "clothing", "apparel", "fashion"), "Apparel & Accessories > Clothing"),
            (("beauty", "skin", "makeup", "cosmetic", "hair", "fragrance"), "Health & Beauty > Personal Care"),
            (("kitchen", "cook", "furniture", "home", "decor", "bedding"), "Home & Garden"),
            (("book", "novel", "paperback"), "Media > Books"),
            (("toy", "game", "baby", "toddler"), "Toys & Games"),
            (("sport", "fitness", "outdoor", "exercise"), "Sporting Goods"),
        ]

    def map(self, text: str) -> int | None:
        normalized = self._normalize(text)
        for keywords, target_path in self.rules:
            if any(keyword in normalized for keyword in keywords):
                category_id = self._find_existing_path(target_path)
                if category_id:
                    return category_id

        if normalized in self.normalized_paths:
            return self.path_to_id[self.normalized_paths[normalized]]

        candidates = get_close_matches(normalized, self.normalized_paths.keys(), n=1, cutoff=0.68)
        if candidates:
            return self.path_to_id[self.normalized_paths[candidates[0]]]

        return self._find_existing_path("Uncategorized")

    def _find_existing_path(self, preferred_path: str) -> int | None:
        if preferred_path in self.path_to_id:
            return self.path_to_id[preferred_path]
        leaf = preferred_path.split(" > ")[-1]
        for path, category_id in self.path_to_id.items():
            if path.endswith(f"> {leaf}") or path == leaf:
                return category_id
        return None

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed development data for the ecommerce backend.")
    parser.add_argument("--import-products", action="store_true", help="Stream product metadata from Hugging Face and import catalog rows.")
    parser.add_argument("--limit", type=int, default=100, help="Maximum number of imported products.")
    parser.add_argument("--dataset", default=DEFAULT_DATASET, help="Hugging Face dataset name.")
    parser.add_argument("--dataset-config", default=DEFAULT_DATASET_CONFIG, help="Hugging Face dataset config/subset.")
    parser.add_argument("--split", default=DEFAULT_SPLIT, help="Dataset split to stream.")
    parser.add_argument("--taxonomy-url", default=TAXONOMY_URL, help="Google Product Taxonomy URL.")
    parser.add_argument("--reset", action="store_true", help="Delete development seed data before seeding.")
    parser.add_argument("--yes", action="store_true", help="Confirm destructive reset.")
    parser.add_argument("--dry-run", action="store_true", help="Load and normalize data without writing changes.")
    parser.add_argument("--trust-remote-code", action="store_true", help="Allow Hugging Face dataset loader custom code when required by the dataset.")
    parser.add_argument("--validate-images", action="store_true", help="Probe product image URLs and store only reachable image URLs during product import.")
    parser.add_argument("--prune-broken-images", action="store_true", help="Probe existing product image URLs in the database and delete unreachable rows.")
    return parser.parse_args()


def upsert_user(db: Session, email: str, full_name: str, role: str, password: str = SEED_PASSWORD) -> User:
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
        seller = upsert_user(db, f"seed-seller-{index}@example.com", f"Aeris Seller {index}", "seller")
        shops.append(upsert_shop(db, seller.id, f"Amazon Seed Shop {index}", "Imported product catalog for integration testing."))
    return shops


def reset_seed_data(db: Session) -> None:
    for model in [
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
        (category.name, category.parent_id): category for category in db.scalars(select(Category)).all()
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


def stream_amazon_rows(dataset: str, dataset_config: str, split: str, trust_remote_code: bool) -> Any:
    from datasets import load_dataset

    return load_dataset(dataset, dataset_config, split=split, streaming=True, trust_remote_code=trust_remote_code)


def normalize_product(row: dict[str, Any], index: int) -> ImportedProduct | None:
    title = clean_text(first_value(row, ["title", "name", "product_title"]))
    if not title:
        return None

    source_id = clean_text(first_value(row, ["parent_asin", "asin", "id"])) or stable_hash(title)
    description = build_description(row)
    category_text = build_category_text(row)
    price = parse_price(first_value(row, ["price", "average_price", "list_price"]), index)
    images = extract_images(row)
    attributes = {
        "source": "amazon_reviews_2023",
        "source_id": source_id,
        "source_category": category_text,
        "brand": clean_text(first_value(row, ["brand", "store"])),
        "features": listify(row.get("features"))[:8],
        "rating": row.get("average_rating"),
        "rating_count": row.get("rating_number"),
    }

    return ImportedProduct(
        source_id=source_id,
        title=title[:255],
        description=description,
        price=price,
        category_text=category_text or title,
        image_urls=images,
        attributes={key: value for key, value in attributes.items() if value not in (None, "", [])},
    )


def collect_products(args: argparse.Namespace) -> list[ImportedProduct]:
    products: list[ImportedProduct] = []
    try:
        rows = stream_amazon_rows(args.dataset, args.dataset_config, args.split, args.trust_remote_code)
        for index, row in enumerate(islice(rows, args.limit * 10), start=1):
            product = normalize_product(dict(row), index)
            if product:
                products.append(product)
            if len(products) >= args.limit:
                break
    except Exception as exc:
        raise RuntimeError(
            "Could not stream Amazon product metadata from Hugging Face. "
            "Check network access, add --trust-remote-code if this dataset requires custom loading code, "
            "or override --dataset/--dataset-config/--split."
        ) from exc
    return products


def import_products(db: Session, products: list[ImportedProduct], shops: list[Shop], mapper: CategoryMapper, validate_images: bool) -> int:
    imported = 0
    skipped_images = 0
    for index, imported_product in enumerate(products):
        existing = db.scalar(select(Product).where(Product.attributes["source_id"].as_string() == imported_product.source_id))
        shop = shops[index % len(shops)]
        category_id = mapper.map(f"{imported_product.category_text} {imported_product.title}")
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
            db.execute(delete(ProductImage).where(ProductImage.product_id == product.id))
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

        image_urls = imported_product.image_urls[:4]
        if validate_images:
            valid_urls = []
            for url in image_urls:
                if is_reachable_image(url):
                    valid_urls.append(url)
                else:
                    skipped_images += 1
            image_urls = valid_urls

        for image_index, url in enumerate(image_urls):
            db.add(ProductImage(product_id=product.id, url=url[:500], is_primary=image_index == 0))
        imported += 1

    if validate_images:
        print(f"Image validation skipped unreachable URLs={skipped_images}.")
    return imported


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
        parts.append("Product imported from public Amazon Reviews 2023 metadata for catalog integration testing.")
    return "\n".join(parts[:8])


def build_category_text(row: dict[str, Any]) -> str:
    categories = row.get("categories") or row.get("category") or row.get("main_category")
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


def extract_images(row: dict[str, Any]) -> list[str]:
    urls: list[str] = []
    for key in ["images", "image", "main_image", "large", "hi_res"]:
        collect_image_urls(row.get(key), urls)
    seen = set()
    unique = []
    for url in urls:
        if url.startswith("http") and url not in seen:
            unique.append(url)
            seen.add(url)
    return unique


def collect_image_urls(value: Any, urls: list[str]) -> None:
    if value is None:
        return
    if isinstance(value, str):
        urls.append(value)
        return
    if isinstance(value, list):
        for item in value:
            collect_image_urls(item, urls)
        return
    if isinstance(value, dict):
        for key in ["large", "hi_res", "thumb", "variant", "main", "url"]:
            collect_image_urls(value.get(key), urls)


def is_reachable_image(url: str) -> bool:
    request = Request(url, method="GET", headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=0-0"})
    try:
        with urlopen(request, timeout=8) as response:
            content_type = response.headers.get("content-type", "")
            return response.status in (200, 206) and content_type.startswith("image/")
    except (HTTPError, URLError, OSError):
        return False


def stable_hash(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:16]


def deterministic_stock(source_id: str) -> int:
    digest = int(stable_hash(source_id), 16)
    return 5 + digest % 96


def print_counts(db: Session, prefix: str) -> None:
    counts = {
        "categories": db.scalar(select(func.count()).select_from(Category)),
        "shops": db.scalar(select(func.count()).select_from(Shop)),
        "products": db.scalar(select(func.count()).select_from(Product)),
        "product_images": db.scalar(select(func.count()).select_from(ProductImage)),
    }
    print(f"{prefix}: " + ", ".join(f"{key}={value}" for key, value in counts.items()))


def prune_broken_images(db: Session) -> tuple[int, int]:
    images = db.scalars(select(ProductImage)).all()
    kept = 0
    removed = 0
    for image in images:
        if is_reachable_image(image.url):
            kept += 1
        else:
            db.delete(image)
            removed += 1
    db.flush()
    return kept, removed


def run(args: argparse.Namespace) -> None:
    if args.reset and not args.yes:
        raise SystemExit("Refusing to reset database without --yes. Re-run with --reset --yes if this is intentional.")

    db = SessionLocal()
    try:
        if args.dry_run:
            products = collect_products(args) if args.import_products else []
            print(f"Dry run: collected {len(products)} products from {args.dataset}/{args.dataset_config}:{args.split}.")
            for product in products[:5]:
                print(f"- {product.title} | {product.category_text} | {product.price} | images={len(product.image_urls)}")
            return

        if args.reset:
            print("Reset confirmed. Deleting development database rows before seeding...")
            reset_seed_data(db)

        if args.prune_broken_images:
            kept, removed = prune_broken_images(db)
            db.commit()
            print(f"Image validation completed. kept={kept}, removed={removed}.")
            print_counts(db, "Current counts")
            return

        shops = seed_core_users_and_shops(db)
        path_to_id = seed_taxonomy(db, args.taxonomy_url)
        imported = 0
        if args.import_products:
            products = collect_products(args)
            mapper = CategoryMapper(path_to_id)
            imported = import_products(db, products, shops, mapper, args.validate_images)

        db.commit()
        print(f"Seed completed. Imported products={imported}.")
        print_counts(db, "Current counts")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run(parse_args())
