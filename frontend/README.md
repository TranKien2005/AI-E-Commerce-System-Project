# Frontend Guide

Frontend là Next.js workspace gồm hai app:

- `storefront/`: public marketplace, buyer flows, seller workspace pages và chat bubbles.
- `admin/`: admin console.

Cả hai app dùng Next.js App Router, React, TypeScript và Tailwind CSS v4. Backend mặc định là `http://localhost:8000/api/v1`.

## 1. Directory structure

```text
frontend/
├── admin/                   # Next app admin console, port 3001
│   ├── src/app/             # App Router pages/layouts
│   ├── src/components/      # Admin UI components
│   └── src/lib/             # API client, auth client, types, format helpers
├── storefront/              # Next app storefront, port 3000
│   ├── src/app/             # Public/buyer/seller routes
│   ├── src/components/      # Navbar, catalog, chat bubbles, shared UI
│   └── src/lib/             # API clients, auth helpers, event socket helpers, types
├── package.json
└── README.md
```

## 2. Install and run

```bash
cd frontend
npm install
```

Storefront:

```bash
npm run dev:storefront
# http://localhost:3000
```

Admin:

```bash
npm run dev:admin
# http://localhost:3001
```

## 3. Build and lint

```bash
npm run lint
npm run build
```

Individual apps:

```bash
npm run lint:storefront
npm run lint:admin
npm run build:storefront
npm run build:admin
```

## 4. Environment

Default backend API base:

```text
http://localhost:8000/api/v1
```

Override with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

The same base URL is converted from `http(s)` to `ws(s)` for WebSocket helpers.

## 5. API client contract

Storefront API client:

| File | Purpose |
|---|---|
| `storefront/src/lib/api-client.ts` | `apiFetch<T>()`, unwraps backend response envelope |
| `storefront/src/lib/api-types.ts` | Shared response types |
| `storefront/src/lib/storefront-api.ts` | Buyer/public API wrappers |
| `storefront/src/lib/seller-api.ts` | Seller API wrappers |
| `storefront/src/lib/chat-events.ts` | WebSocket helper for chat/account realtime events |
| `storefront/src/lib/auth-client.ts` | Token storage/login/register helpers |

Admin API client:

| File | Purpose |
|---|---|
| `admin/src/lib/api-client.ts` | Admin `apiFetch<T>()` |
| `admin/src/lib/admin-api.ts` | Admin endpoint wrappers |
| `admin/src/lib/auth-client.ts` | Admin token helpers |

All HTTP responses are expected as backend envelope:

```json
{ "success": true, "data": {} }
```

Errors are thrown from:

```json
{
  "success": false,
  "error": { "code": "...", "message": "..." }
}
```

## 6. Auth model

Current development auth uses localStorage bearer tokens.

Storefront keys:

| Key | Purpose |
|---|---|
| `storefront_access_token` | Bearer token for API/WebSocket |
| `storefront_refresh_token` | Refresh token |

Admin keys:

| Key | Purpose |
|---|---|
| `admin_access_token` | Admin bearer token |
| `admin_refresh_token` | Admin refresh token |

Important UI rule:

- Do not read `localStorage` directly in `useState(() => ...)` for SSR-rendered client components.
- Use a hydrated state pattern: render stable loading text first, then read token in `useEffect`/`queueMicrotask`.
- This avoids React hydration mismatch warnings.

## 7. Storefront routes

| Route | Type | Purpose |
|---|---|---|
| `/` | public | Home, category/product sections, marketplace search |
| `/products` | public/dynamic | Unified shop + product search/catalog |
| `/products/[id]` | public/dynamic | Product detail, add-to-cart, shop chat, reviews |
| `/shops/[id]` | public/dynamic | Public shop page, in-shop product search, product rows |
| `/cart` | auth | Buyer cart |
| `/checkout` | auth | Create order from cart |
| `/orders` | auth | Buyer order list |
| `/orders/[id]` | auth/dynamic | Buyer order detail |
| `/notifications` | auth | Account notifications with delete/read actions |
| `/profile` | auth | Profile management |
| `/seller-request` | auth | Request to open a shop |
| `/seller` | seller/admin | Seller overview |
| `/seller/shop` | seller/admin | Seller shop edit |
| `/seller/products` | seller/admin | Seller product list |
| `/seller/products/new` | seller/admin | Create seller product with category select |
| `/seller/products/[id]/edit` | seller/admin | Edit seller product |
| `/seller/orders` | seller/admin | Seller-visible orders |
| `/seller/orders/[id]` | seller/admin | Seller order detail, status update only |
| `/seller/chatbot` | seller/admin | Chatbot config form |
| `/seller/chat` | seller/admin | Informational page; actual shop inbox is floating seller chat bubble |

## 8. Search/catalog UI

Search bar:

- Keeps `keyword` vs `intent` mode toggle.
- Does not expose product/shop target toggle.
- Submits to `/products?q=<query>&mode=<keyword|intent>`.

Products page calls `getProducts()` and expects unified marketplace response:

```ts
type MarketplaceSearchResult = {
  shops: Paginated<ShopListItem>;
  products: Paginated<ProductListItem>;
};
```

UI layout:

1. Shop results appear first when there is a query.
2. Shop results have separate `shop_page` pagination.
3. Product grid has separate `page` pagination.
4. Product cards use `AddToCartButton`, not hardcoded login links.

## 9. Cart/checkout/order UI

Cart:

- `GET /cart` loads authenticated cart.
- Add/update/delete actions optimistically update UI and emit `storefront-auth-changed` for navbar refresh.
- Navbar cart preview refreshes from account WebSocket events or manual auth-change/focus events.

Checkout:

- `POST /orders` creates order from cart.
- Checkout does **not** auto-deliver anymore.
- Initial state returned by backend: `status=pending`, `shipping_status=preparing`.

Seller orders:

- Seller order list/detail only display items belonging to current seller shop.
- Seller detail page exposes only order status update form.
- Separate shipping form was removed because current workflow uses order `status` as the fulfillment state.
- Status dropdown only shows valid transitions.

## 10. Notifications UI

Page: `/notifications`

Actions:

| UI action | API |
|---|---|
| Load notifications | `GET /notifications` |
| Mark one read | `PATCH /notifications/{id}/read` |
| Mark all read | `PATCH /notifications/read-all` |
| Delete one notification | `DELETE /notifications/{id}` |

Navbar notification state:

- Uses `WS /account/events` for immediate refresh.
- Does not poll continuously.
- Also refreshes on `storefront-auth-changed` and browser focus.

## 11. Realtime WebSocket model

Helper file:

```text
storefront/src/lib/chat-events.ts
```

### Account events

```text
WS /api/v1/account/events?token=<access_token>
```

Frontend helper:

```ts
openAccountEventSocket(token, (event) => { ... })
```

Known event types:

| Event | Frontend response |
|---|---|
| `cart_updated` | Refetch cart preview/count |
| `order_created` | Refetch notifications/order state |
| `order_updated` | Refetch notifications/order state |
| `seller_order_created` | Refetch seller notifications/order badge state |
| `notification_deleted` | Refetch notifications if needed |

### Chat events

```text
WS /api/v1/chat/events?token=<access_token>
```

Frontend helper:

```ts
openChatEventSocket(token, (event) => { ... })
```

Known event types:

| Event | Frontend response |
|---|---|
| `chat_conversation` | Refresh conversation list |
| `chat_message` | Refresh conversation list and current messages if selected |

Chat messages intentionally do not create rows in `notifications`; chat badges are handled by chat events and unread counts.

## 12. Chat UI model

Two separate floating widgets exist in storefront layout:

| Widget | Component | Position | Visible to | Purpose |
|---|---|---|---|---|
| Buyer chat | `StorefrontChatWidget` | Bottom right | Any logged-in buyer/user | User chats with shops |
| Seller shop chat | `SellerChatWidget` | Bottom right above buyer bubble | `seller`/`admin` accounts | Shop owner replies to customers |

Seller sidebar no longer links to a full chat table. `/seller/chat` is only an informational page that tells seller to use the floating shop bubble.

## 13. Seller product UI

Create product page:

- Uses category select from `GET /categories`.
- Does not allow arbitrary category id typing.
- Shows pending/success/error states.
- Removed inert AI helper box.

Product create/update backend validates `category_id`; invalid category returns clean 400.

## 14. Images

`storefront/next.config.ts` currently allows remote images over `http` and `https` for local imported datasets:

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "**" },
    { protocol: "http", hostname: "**" },
  ];
}
```

`safeImageUrl()` extracts a URL from dirty strings and falls back to a placeholder. If a remote URL itself 404s, the browser may still show a broken image; the app should not crash due to unconfigured host.

## 15. Hydration-safe pattern

For any client component that depends on localStorage token, use this pattern:

```tsx
const [token, setToken] = useState<string | null>(null);
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  queueMicrotask(() => {
    setToken(getAccessToken());
    setHydrated(true);
  });
}, []);

if (!hydrated) return <LoadingState />;
if (!token) return <LoginRequired />;
```

Avoid:

```tsx
const [token] = useState(() => getAccessToken());
```

because server render and client render can diverge.

## 16. Admin app

Routes:

| Route | Purpose |
|---|---|
| `/login` | Admin login |
| `/` | Dashboard metrics/logs |
| `/metrics` | KPI system metrics |
| `/users` | User role/status management |
| `/seller-requests` | Approve/reject seller requests |
| `/reports` | Resolve reports |
| `/audit-logs` | Audit logs |
| `/logs` | System logs |

Admin app uses a separate token namespace from storefront.

## 17. Common troubleshooting

### Hydration mismatch

Likely cause: client component reads token/localStorage during initial render. Convert to hydration-safe pattern.

### Notification/cart not updating

Check:

1. Backend WebSocket `/account/events` is connected.
2. Backend action publishes `account_events.publish_from_thread(...)`.
3. Navbar socket is alive and token is valid.
4. Backend dev server was restarted after code changes.

### Chat not updating

Check:

1. Backend WebSocket `/chat/events` is connected.
2. Message send endpoint publishes `chat_events.publish_from_thread(...)`.
3. Buyer and seller are using different accounts.
4. Product chat opens conversation with `shop_id`, not only `seller_id`.

### Seller does not see new order notification

Checkout must collect seller ids before deleting cart items. Backend currently does this in `buyer_service.create_order()`.

### Next image unconfigured host

Storefront allows wildcard remote image hosts. If error still appears, restart Next dev server so `next.config.ts` is reloaded.
