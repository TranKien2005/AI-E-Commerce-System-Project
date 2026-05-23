# AI E-Commerce System Project

Dự án mô phỏng marketplace nhiều vai trò, gồm backend FastAPI và frontend Next.js. Hệ thống hiện hỗ trợ buyer, seller/shop owner và admin, có catalog/search, cart, checkout, order management, notification realtime và chat realtime qua WebSocket.

## 1. Repository layout

```text
.
├── backend/                 # FastAPI + SQLAlchemy + Alembic + PostgreSQL
├── frontend/                # Next.js workspace: storefront + admin
├── CLAUDE.md                # Ghi chú kiến trúc/lệnh cho Claude Code
├── README.md                # Tài liệu tổng quan dự án
└── .gitignore
```

## 2. Apps

| App | Path | Local URL | Vai trò |
|---|---|---|---|
| Backend API | `backend/` | `http://localhost:8000/api/v1` | Auth, marketplace API, seller/admin API, WebSocket events |
| Storefront | `frontend/storefront/` | `http://localhost:3000` | Public catalog, buyer flows, seller workspace |
| Admin console | `frontend/admin/` | `http://localhost:3001` | Admin dashboard, users, reports, seller requests |

## 3. Local quick start

### Backend infrastructure

```bash
cd backend
docker compose up -d
```

Local services:

| Service | URL/Port |
|---|---|
| PostgreSQL | `localhost:5433/ecommerce` |
| Redis | `localhost:6379` |
| MailHog SMTP | `localhost:1025` |
| MailHog UI | `http://localhost:8025` |

### Backend API

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

OpenAPI docs:

```text
http://localhost:8000/docs
```

### Seed data

```bash
PYTHONPATH=backend python backend/scripts/seed.py --reset --yes --import-products --limit 100 --trust-remote-code
```

Seed accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@123` |
| Buyer | `buyer@example.com` | `Buyer@123` |
| Seller | `seed-seller-1@example.com` ... `seed-seller-5@example.com` | `Seed@123` |

### Frontend

```bash
cd frontend
npm install
npm run dev:storefront
npm run dev:admin
```

## 4. Docker Desktop Kubernetes demo

This local Kubernetes setup runs backend, PostgreSQL, Redis, MailHog, Jaeger, Prometheus, and Grafana inside Docker Desktop Kubernetes.

Prerequisite: enable Kubernetes in Docker Desktop, then verify:

```powershell
kubectl config use-context docker-desktop
kubectl get nodes
```

Start or redeploy the app stack:

```powershell
cd backend
.\k8s-up.ps1
```

The script builds the backend image, loads it into the Docker Desktop Kubernetes container runtime, applies the app and monitoring manifests, waits for dependencies, runs Alembic migrations, restarts the backend, and opens demo port-forwards.

Run seed data inside Kubernetes:

```powershell
.\k8s-seed.ps1
```

Reset and seed again:

```powershell
.\k8s-seed.ps1 -SeedArgs @("--reset", "--yes")
```

The same `k8s-up.ps1` command opens demo ports automatically:

| Service | Local URL | Notes |
|---|---|---|
| Backend API | `http://localhost:8000` | OpenAPI at `/docs`, metrics at `/metrics` |
| MailHog UI | `http://localhost:8025` | View OTP/order emails sent by backend |
| Jaeger UI | `http://localhost:16686` | Select service `ecommerce-backend` and find traces |
| Prometheus UI | `http://localhost:9090` | Scrapes `ecommerce-backend:80/metrics` |
| Grafana UI | `http://localhost:3002` | Login `admin` / `Admin@123`; Prometheus and Loki datasources are preconfigured |

Temporarily stop the Kubernetes app and monitoring stack while keeping data/config:

```powershell
.\k8s-down.ps1
```

Remove Kubernetes workloads/config, including monitoring, but keep PostgreSQL data:

```powershell
.\k8s-down.ps1 -Remove
```

Remove everything including PostgreSQL data:

```powershell
.\k8s-down.ps1 -Remove -RemoveData
```

## 5. Observability and resilience

The backend exposes and emits:

| Capability | How to view/test |
|---|---|
| Logs | Grafana Explore with datasource `Loki`, query `{app="ecommerce-backend"}`; terminal fallback: `kubectl logs deployment/ecommerce-backend` |
| Metrics | `http://localhost:8000/metrics`; Prometheus scrapes the same endpoint in Kubernetes |
| Tracing | Jaeger UI at `http://localhost:16686`, service `ecommerce-backend` |
| Rate limit | Auth endpoints use app-level limits, configurable by `RATE_LIMIT_*` env vars |
| Circuit breaker | Resend email calls are protected by `pybreaker`, configurable by `CIRCUIT_BREAKER_*` env vars |

## 6. Current marketplace behavior

### Search

- Storefront search has two modes: `keyword` and `intent`.
- It does **not** require user to choose product/shop target.
- `GET /products` returns both:
  - `shops`: shop search results shown first.
  - `products`: product results with pagination.
- Product response keeps legacy top-level `items/meta` aliases for older tests/clients.

### Cart and checkout

- Cart is account-scoped by `CartItem.user_id`.
- Checkout creates an order from current cart, decrements product stock and clears cart.
- Order is currently one `orders` row that may contain items from multiple shops.
- Seller order view filters order items down to the current seller’s shop.
- Because `orders.status` is order-level, full marketplace-grade per-shop status is better solved by future migration to split orders by shop.

### Order status

Checkout now creates:

```text
status = pending
shipping_status = preparing
```

Seller changes order status through valid transitions:

```text
pending -> processing | cancelled
processing -> shipping | cancelled
shipping -> delivered
delivered -> terminal
cancelled -> terminal
```

Buyer can review a product only when the buyer has a delivered order containing that product.

### Notifications and realtime account updates

Notifications are stored in `notifications` and are account-scoped by `user_id`.

Realtime account updates use WebSocket:

```text
WS /api/v1/account/events?token=<access_token>
```

Events currently used by frontend:

| Event type | Meaning |
|---|---|
| `cart_updated` | Refresh navbar cart count/preview |
| `order_created` | Buyer order created |
| `order_updated` | Buyer order/shipping status changed |
| `seller_order_created` | Seller has a new order containing products from their shop |
| `notification_deleted` | Notification deleted |

### Chat

Chat does **not** create system notifications anymore.

Realtime chat uses WebSocket:

```text
WS /api/v1/chat/events?token=<access_token>
```

Buyer chat and seller/shop chat are separate UI contexts:

- Buyer chat bubble: customer talks to shops.
- Seller shop chat bubble: seller/admin replies as shop.

Chat events:

| Event type | Meaning |
|---|---|
| `chat_conversation` | New conversation created |
| `chat_message` | New message in a conversation |

## 7. Database architecture summary

| Group | Tables | Notes |
|---|---|---|
| Auth/users | `users` | Role/status/email verification |
| Seller onboarding | `seller_requests`, `shops` | Buyer requests shop, admin approves and creates/activates seller role/shop |
| Catalog | `categories`, `products`, `product_images`, `product_videos` | Product belongs to a shop and optional category |
| Cart/order/payment | `cart_items`, `orders`, `order_items`, `payments` | Current order status is order-level; seller view filters items by shop |
| Review/report | `reviews`, `reports` | One review per user/product by service upsert behavior; review has title/comment/rating |
| Notification/log | `notifications`, `audit_logs` | Notifications are per account |
| Chat | `conversations`, `messages`, `chatbot_configs` | Conversation has `buyer_id`, `seller_id`, optional `shop_id` |

Important current limitation:

- `orders.status` and `orders.shipping_status` are shared by the whole order.
- If a cart contains products from multiple shops, seller pages filter visible items but order status is still shared.
- Recommended future architecture: split checkout into one order per shop, or add a first-class `shipments` / `seller_orders` table.

## 8. Quality commands

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## 9. Security/local notes

- Do not commit `.env` or secrets.
- `SECRET_KEY` must be changed for production.
- Frontend stores access/refresh tokens in localStorage for development convenience.
- OTP and refresh-token revocation are currently in-memory.
- WebSocket auth uses the access token as a query param in local dev; production should prefer cookie/BFF or short-lived socket tokens.
