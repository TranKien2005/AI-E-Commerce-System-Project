# Backend Guide

Backend là FastAPI monolith dùng SQLAlchemy ORM, Alembic migration và PostgreSQL. API được mount dưới `/api/v1`, trả response envelope thống nhất và có WebSocket realtime cho chat/account events.

## 1. Technology stack

- FastAPI
- SQLAlchemy 2.x ORM
- Alembic
- PostgreSQL
- Redis local qua Docker Compose, hiện chưa dùng sâu trong auth flow
- MailHog cho email local
- Hugging Face `datasets` cho seed Amazon Reviews 2023
- Google Product Taxonomy cho category seed

## 2. Directory structure

```text
backend/
├── alembic/                 # Migration scripts
├── app/
│   ├── api/v1/              # Routers: auth, buyer, seller, admin, websocket
│   ├── core/                # Config, security, deps, responses, exceptions
│   ├── db/                  # Session và metadata base
│   ├── models/              # SQLAlchemy entities
│   ├── schemas/             # Pydantic request schemas
│   └── services/            # Business logic chính
├── scripts/seed.py          # Seed users, taxonomy, products, images
├── tests/                   # API/integration tests
├── docker-compose.yml       # PostgreSQL, Redis, MailHog
├── requirements.txt
└── README.md
```

## 3. Local setup

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
docker compose up -d
alembic upgrade head
uvicorn app.main:app --reload
```

API base:

```text
http://localhost:8000/api/v1
```

OpenAPI:

```text
http://localhost:8000/docs
```

## 4. Response contract

All HTTP APIs use envelope responses.

Success:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Thông báo lỗi",
    "details": []
  }
}
```

`204 No Content` endpoints return no body.

## 5. Routers

| Router | Prefix | File | Purpose |
|---|---|---|---|
| Auth | `/auth` | `app/api/v1/auth.py` | Register, OTP, login, refresh, logout, password reset |
| Buyer/public | `/` | `app/api/v1/buyer.py` | Catalog, search, shops, cart, orders, reviews, notifications, chat |
| Seller | `/seller` | `app/api/v1/seller.py` | Shop, products, seller orders, stats, chatbot, seller chat |
| Admin | `/admin` | `app/api/v1/admin.py` | Metrics, users, seller requests, reports, audit/system logs |
| WebSocket | `/chat/events`, `/account/events` | `app/api/v1/chat_ws.py` | Realtime chat/account events |

## 6. Database model reference

### `users`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | User id |
| `email` | string unique | Login email |
| `password` | string | Hashed password |
| `role` | string | `buyer`, `seller`, `admin` |
| `status` | string | `pending_verification`, `active`, `deleted`, etc. |
| `full_name` | string | Display name |
| `email_verified_at` | datetime nullable | OTP verification timestamp |
| `deleted_at` | datetime nullable | Soft delete marker |

### `shops`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Shop id |
| `owner_id` | FK `users.id` | Seller/admin who owns shop |
| `name` | string | Public shop name |
| `description` | text | Public description |
| `status` | string | Usually `active` |

### `categories`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Category id |
| `name` | string | Category name |
| `parent_id` | FK nullable | Parent category |

### `products`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Product id |
| `shop_id` | FK `shops.id` | Owning shop |
| `category_id` | FK nullable | Optional category |
| `name` | string | Product title |
| `description` | text | Description |
| `price` | numeric | VND price in frontend display |
| `stock` | int | Available quantity |
| `attributes` | JSON | Imported metadata/specs |
| `deleted_at` | datetime nullable | Soft delete |

### `cart_items`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Cart item id |
| `user_id` | FK `users.id` | Buyer account |
| `product_id` | FK `products.id` | Product |
| `quantity` | int | Quantity |

Unique constraint: `(user_id, product_id)`.

### `orders`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Order id |
| `user_id` | FK `users.id` | Buyer account |
| `total_price` | numeric | Current total for whole order |
| `status` | string | Order-level status |
| `payment_status` | string | Payment state |
| `shipping_address` | text | Address copied from checkout |
| `shipping_status` | string | Legacy/secondary field; frontend seller currently uses `status` as main workflow |
| `shipping_note` | text | Legacy note |
| `deleted_at` | datetime nullable | Soft delete marker |

Current status transition rules in seller service:

```text
pending -> processing | cancelled
processing -> shipping | cancelled
shipping -> delivered
delivered -> terminal
cancelled -> terminal
```

Important limitation:

- `orders.status` is shared by the whole order.
- Seller view filters `order_items` by current shop, but the order itself is still one row.
- Future marketplace-correct design should split checkout into one order per shop, or introduce `seller_orders` / `shipments` with per-shop status.

### `order_items`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Item id |
| `order_id` | FK `orders.id` | Parent order |
| `product_id` | FK `products.id` | Purchased product |
| `quantity` | int | Quantity bought |
| `price` | numeric | Unit price snapshot |

### `reviews`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Review id |
| `user_id` | FK `users.id` | Reviewer |
| `product_id` | FK `products.id` | Product |
| `rating` | int | 1..5 |
| `title` | string | Review title |
| `comment` | text | Review body |
| `verified_purchase` | bool | Set true when review is backed by delivered order |
| `helpful_votes` | int | Imported/future metadata |
| `source_user_id` | string | Imported source id |
| `source_review_id` | string indexed | Imported source review id |

Service behavior: `POST /reviews` upserts one review per `(user_id, product_id)` instead of creating duplicates.

### `notifications`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Notification id |
| `user_id` | FK `users.id` | Receiving account |
| `content` | text | Message body |
| `type` | string | `order`, `seller_order`, `shipping`, `payment`, etc. |
| `channel` | string | `system`, `email`, etc. |
| `is_read` | bool | Read state |

Chat messages intentionally do not create notifications; chat badges use chat realtime events only.

### `conversations`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Conversation id |
| `buyer_id` | FK `users.id` | Buyer participant |
| `seller_id` | FK `users.id` | Shop owner participant |
| `shop_id` | FK `shops.id`, nullable | Shop context |
| `is_bot_enabled` | bool | Bot config flag |

Buyer chat and seller/shop chat use separate endpoints and UI contexts.

### `messages`

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | Message id |
| `conversation_id` | FK `conversations.id` | Conversation |
| `sender_id` | FK `users.id` | Account sender |
| `content` | text | Message body |
| `is_bot` | bool | Bot message marker |
| `is_read` | bool | Read marker |

## 7. HTTP endpoint reference

### Auth

#### `POST /auth/register`

Body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `email` | string | yes | Login email |
| `password` | string | yes | Minimum policy enforced in service |
| `full_name` | string | yes | Display name |

Returns: created user id/email and sends OTP email.

#### `POST /auth/verify-otp`

Body:

| Field | Type | Required |
|---|---|---:|
| `email` | string | yes |
| `otp` | string | yes |

Returns: `{ "verified": true }`.

#### `POST /auth/login`

Body:

| Field | Type | Required |
|---|---|---:|
| `email` | string | yes |
| `password` | string | yes |

Returns:

| Field | Type |
|---|---|
| `access_token` | string |
| `refresh_token` | string |
| `token_type` | string |

### Catalog/search

#### `GET /categories`

Public. Query params: none.

Returns: `{ items: [{ id, name, parent_id }] }`.

#### `GET /products`

Public. Unified marketplace search.

Query params:

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | `""` | Search text; alias of `keyword` |
| `keyword` | string | `""` | Legacy alias |
| `search_type` | string | `keyword` | Kept for compatibility, not used as target selector |
| `category_id` | int | null | Filter products by category |
| `shop_id` | int | null | Filter products by shop |
| `min_price` | float | null | Minimum price |
| `max_price` | float | null | Maximum price |
| `min_rating` | int | null | Minimum average rating |
| `sort` | string | null | `price_asc`, `price_desc`, `top_sales`, `popular`, `newest` |
| `page` | int | `1` | Product page |
| `page_size` | int | `20` | Product page size |
| `shop_page` | int | `1` | Shop result page |
| `shop_page_size` | int | `4` | Shop result page size |

Response data:

```json
{
  "shops": {
    "items": [
      {
        "id": 1,
        "name": "Shop name",
        "description": "...",
        "product_count": 10,
        "sold_count": 25,
        "top_product_image": "https://..."
      }
    ],
    "meta": { "page": 1, "page_size": 4, "total": 1, "total_pages": 1 }
  },
  "products": {
    "items": [
      {
        "id": 100,
        "name": "Product",
        "price": 100000,
        "stock": 5,
        "primary_image": "https://...",
        "shop_id": 1,
        "shop_name": "Shop name",
        "category_id": 2,
        "category": { "id": 2, "name": "Category" },
        "avg_rating": 4.5,
        "review_count": 3,
        "sold_count": 7
      }
    ],
    "meta": { "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }
  },
  "items": [],
  "meta": {}
}
```

`items/meta` are legacy aliases for `products.items/products.meta`.

#### `GET /products/{id}`

Public product detail.

Path params:

| Param | Type |
|---|---|
| `id` | int |

Returns product detail with category, attributes, images, videos, shop, rating summary.

#### `GET /products/{id}/reviews`

Public.

Returns `{ items: Review[] }`.

#### `GET /shops`

Public shop list/search.

Query params:

| Param | Type | Default |
|---|---|---|
| `q` | string | null |
| `page` | int | `1` |
| `page_size` | int | `12` |

#### `GET /shops/{id}`

Public shop detail.

Path params:

| Param | Type |
|---|---|
| `id` | int |

Returns `{ id, name, description, status }`.

### Buyer account/cart/order

All endpoints below require `Authorization: Bearer <access_token>`.

#### `GET /users/me`

Returns current user summary.

#### `PUT /users/me`

Body:

| Field | Type | Required |
|---|---|---:|
| `full_name` | string | yes |

#### `GET /cart`

Returns `{ items: CartItem[] }`.

#### `POST /cart/items`

Body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `product_id` | int | yes | Product to add |
| `quantity` | int | yes | Must be > 0 |

Side effects:

- Adds or increments cart item.
- Publishes `account/events` `cart_updated` for current user.

#### `PUT /cart/items/{item_id}`

Path params:

| Param | Type |
|---|---|
| `item_id` | int |

Body:

| Field | Type | Required |
|---|---|---:|
| `quantity` | int | yes |

Publishes `cart_updated`.

#### `DELETE /cart/items/{item_id}`

Deletes cart item and publishes `cart_updated`.

#### `POST /orders`

Body:

| Field | Type | Required |
|---|---|---:|
| `shipping_address` | string | yes |

Behavior:

- Creates an order from current cart.
- Initial order state: `status=pending`, `shipping_status=preparing`.
- Decrements stock.
- Clears cart.
- Creates buyer notification.
- Creates seller notification for each shop owner in the order.
- Publishes account events: `order_created`, `cart_updated`, `seller_order_created`.

Returns:

```json
{ "order_id": 123, "status": "pending", "shipping_status": "preparing" }
```

#### `GET /orders/my`

Query params:

| Param | Type | Default | Notes |
|---|---|---|---|
| `status` | string | null | Filter by order status |
| `from_date` | string | null | ISO-ish date; invalid ignored |
| `to_date` | string | null | ISO-ish date; invalid ignored |
| `page` | int | `1` | Page |
| `page_size` | int | `20` | Page size |

#### `GET /orders/{id}`

Returns buyer-owned order detail.

#### `POST /orders/{id}/cancel`

Cancels order if status is `pending` or `processing`, restores stock, creates notification and publishes `order_updated`.

### Reviews

#### `POST /reviews`

Requires buyer auth.

Body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `product_id` | int | yes | Product reviewed |
| `rating` | int | yes | 1..5 |
| `title` | string | no | Review title |
| `comment` | string | no | Review body |

Rules:

- Buyer must have a delivered order containing the product.
- Service upserts one review per user/product.

### Notifications

#### `GET /notifications`

Requires auth. Returns current account notifications sorted newest first.

#### `PATCH /notifications/{id}/read`

Body:

| Field | Type | Default |
|---|---|---|
| `is_read` | bool | `true` |

#### `PATCH /notifications/read-all`

Marks all current user notifications read.

#### `DELETE /notifications/{id}`

Deletes one current-user notification. Returns `204`.

### Buyer chat

#### `POST /chat/conversations`

Requires buyer auth.

Body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `shop_id` | int | no | Preferred way to open shop chat |
| `seller_id` | int | no | Legacy fallback |

At least one of `shop_id` or `seller_id` is required. If `shop_id` is provided, backend resolves seller owner.

#### `GET /chat/conversations`

Lists only conversations where current user is buyer.

#### `GET /chat/conversations/{conversation_id}/messages`

Lists messages for buyer-owned conversation.

#### `POST /chat/conversations/{conversation_id}/messages`

Body:

| Field | Type | Required |
|---|---|---:|
| `content` | string | yes |

Publishes `chat/events` to seller. Does not create notification rows.

#### `PATCH /chat/conversations/{conversation_id}/read`

Marks unread messages from other participant as read.

### Seller shop/products

All require seller/admin auth.

#### `GET /seller/shop`

Returns current seller shop.

#### `PUT /seller/shop`

Body:

| Field | Type | Required |
|---|---|---:|
| `name` | string | yes |
| `description` | string | yes |

#### `GET /seller/products`

Query params:

| Param | Type | Default |
|---|---|---|
| `page` | int | `1` |
| `page_size` | int | `20` |

#### `POST /seller/products`

Body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `name` | string | yes | Product title |
| `description` | string | yes | Description |
| `price` | float | yes | Price |
| `stock` | int | yes | Stock |
| `category_id` | int/null | no | Validated if provided |

If `category_id` does not exist, returns clean 400 instead of DB FK error.

#### `PUT /seller/products/{id}`

Same body as create. Product must belong to current seller shop.

#### `DELETE /seller/products/{id}`

Soft deletes product via `deleted_at`.

#### Product images

| Method/path | Params/body | Notes |
|---|---|---|
| `POST /seller/products/{id}/images` | query `url`, `is_primary=false` | Adds image URL |
| `PATCH /seller/products/images/{id}` | body `{ is_primary: bool }` | Set/unset primary |
| `DELETE /seller/products/images/{id}` | none | Delete image |

### Seller orders

#### `GET /seller/orders`

Query params:

| Param | Type | Default |
|---|---|---|
| `page` | int | `1` |
| `page_size` | int | `20` |

Returns orders containing products from current seller shop. Items are filtered to current shop only. `total_price` in seller response is shop subtotal, not full buyer order total.

#### `GET /seller/orders/{id}`

Returns seller-visible order detail with only current-shop items.

#### `PATCH /seller/orders/{id}`

Body:

| Field | Type | Required | Valid transitions |
|---|---|---:|---|
| `status` | string | yes | `pending -> processing/cancelled`, `processing -> shipping/cancelled`, `shipping -> delivered` |

Side effects:

- Updates `orders.status`.
- Creates notification for buyer.
- Publishes `account/events` `order_updated` to buyer.

#### `PATCH /seller/orders/{id}/shipping`

Legacy endpoint. Body:

| Field | Type | Required |
|---|---|---:|
| `shipping_status` | string | yes |
| `shipping_note` | string | no |

Current storefront seller UI no longer exposes this separately because order status is the main workflow.

### Seller chat

#### `GET /seller/chat/conversations`

Lists conversations for the current seller’s owned shop.

#### `GET /seller/chat/conversations/{conversation_id}/messages`

Lists messages for a seller-owned shop conversation.

#### `POST /seller/chat/conversations/{conversation_id}/messages`

Body:

| Field | Type | Required |
|---|---|---:|
| `content` | string | yes |

Publishes `chat/events` to buyer. Does not create notification rows.

#### `PATCH /seller/chat/conversations/{conversation_id}/read`

Marks unread buyer messages as read.

### Seller stats/chatbot

#### `GET /seller/stats`

Query params:

| Param | Type | Default |
|---|---|---|
| `from_date` | string | null |
| `to_date` | string | null |

Returns revenue/order count/best selling products for current shop.

#### `GET /seller/chatbot-config`

Returns masked chatbot config.

#### `PATCH /seller/chatbot-config`

Body:

| Field | Type | Required |
|---|---|---:|
| `api_key` | string | yes |
| `prompt` | string | yes |
| `template` | string | yes |
| `is_enabled` | bool | yes |

### Admin

Admin endpoints are under `/admin` and require admin auth. Main groups:

| Method/path | Purpose |
|---|---|
| `GET /admin/metrics` | Dashboard KPIs |
| `GET /admin/users` | User list/filter |
| `PATCH /admin/users/{id}` | Update role/status |
| `GET /admin/seller-requests` | Seller request list |
| `POST /admin/seller-requests/{id}/approve` | Approve seller request |
| `POST /admin/seller-requests/{id}/reject` | Reject seller request |
| `GET /admin/reports` | Reports list |
| `PATCH /admin/reports/{id}` | Resolve report |
| `GET /admin/audit-logs` | Audit logs |
| `GET /admin/logs` | System logs |

## 8. WebSocket endpoint reference

### Auth model

Both sockets accept access token as query param:

```text
?token=<access_token>
```

If token is missing/invalid or user is not active, server closes with code `1008`.

### `WS /chat/events`

Realtime chat only. Chat does not create system notification rows.

Event payloads:

```json
{
  "type": "chat_message",
  "conversation_id": 1,
  "message_id": 10,
  "shop_id": 5,
  "sender_id": 2
}
```

```json
{
  "type": "chat_conversation",
  "conversation_id": 1,
  "shop_id": 5
}
```

### `WS /account/events`

Realtime account changes for navbar/cart/notifications/orders.

Event payloads:

```json
{ "type": "cart_updated" }
{ "type": "order_created", "order_id": 123 }
{ "type": "order_updated", "order_id": 123 }
{ "type": "seller_order_created", "order_id": 123 }
{ "type": "notification_deleted", "notification_id": 9 }
```

Frontend should respond by refetching the relevant account state (`/cart`, `/notifications`, `/orders`, seller orders, etc.).

## 9. Seed data

```bash
PYTHONPATH=backend python backend/scripts/seed.py --reset --yes --import-products --limit 100 --trust-remote-code
```

Important options:

| Option | Meaning |
|---|---|
| `--reset --yes` | Reset dev DB data then seed |
| `--import-products` | Stream product metadata from Amazon Reviews 2023 |
| `--limit N` | Limit imported products |
| `--trust-remote-code` | Allow dataset custom loader |
| `--validate-images` | Probe image URLs |
| `--prune-broken-images` | Remove unreachable image URLs |
| `--dry-run` | Load/normalize without DB writes |

## 10. Testing

```bash
cd backend
pytest
```

Targeted examples:

```bash
pytest tests/test_auth.py
pytest tests/test_search_products.py
pytest tests/test_buyer_flow.py::TestOrders
pytest tests/test_buyer_flow.py::TestNotifications
```

## 11. Migration workflow

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

Always review generated migrations before applying to important data.

## 12. Production notes / known gaps

- OTP and refresh-token revocation are in-memory; production should move to Redis/database.
- Frontend localStorage auth is development-oriented; production should use HttpOnly cookies/BFF or short-lived tokens.
- WebSocket query-token auth is acceptable for local dev but should be hardened in production.
- Order status is still order-level; for true marketplace fulfillment, split orders by shop or add seller-order/shipment table.
