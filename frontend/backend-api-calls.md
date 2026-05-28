# Frontend Backend API Calls

References are relative to `frontend/`.

I found direct backend calls in `apiFetch(...)` wrappers plus WebSocket helpers. I did not find extra `axios`, `EventSource`, `XMLHttpRequest`, or direct endpoint `fetch(...)` calls outside the shared clients.

| endpoint | reference (frontend filepath + line index) | API invocation code | purpose |
|---|---|---|---|
| GET `/categories` | `storefront/src/lib/storefront-api.ts:28` | `apiFetch<{ items: Category[] }>("/categories")` | Load categories |
| GET `/shops?...` | `storefront/src/lib/storefront-api.ts:31` | ``apiFetch<Paginated<ShopListItem>>(`/shops${queryString({ ...params, page_size: params.page_size ?? 12 })}`)`` | List/search shops |
| GET `/shops/{id}` | `storefront/src/lib/storefront-api.ts:33` | ``apiFetch<ShopListItem>(`/shops/${id}`)`` | Load shop detail |
| GET `/products?...` | `storefront/src/lib/storefront-api.ts:36` | ``apiFetch<MarketplaceSearchResult>(`/products${queryString({ ...params, page_size: params.page_size ?? 20, shop_page_size: params.shop_page_size ?? 4 })}`)`` | List/search products |
| POST `/products/intent-search` | `storefront/src/lib/storefront-api.ts:39` | `apiFetch<MarketplaceSearchResult>("/products/intent-search", { method: "POST", body: JSON.stringify({ query, page: Number(page), page_size: Number(pageSize) }) })` | Intent-based product search |
| GET `/products/recommend?page_size={pageSize}` | `storefront/src/lib/storefront-api.ts:44` | ``apiFetch<Paginated<ProductListItem>>(`/products/recommend?page_size=${pageSize}`)`` | Load recommended products |
| GET `/products/{id}` | `storefront/src/lib/storefront-api.ts:46` | ``apiFetch<ProductDetail>(`/products/${id}`)`` | Load product detail |
| GET `/products/{id}/reviews` | `storefront/src/lib/storefront-api.ts:48` | ``apiFetch<{ items: Review[] }>(`/products/${id}/reviews`)`` | Load product reviews |
| GET `/users/me` | `storefront/src/lib/storefront-api.ts:50` | `apiFetch<CurrentUser>("/users/me", { token })` | Load current storefront user |
| PUT `/users/me` | `storefront/src/lib/storefront-api.ts:53` | `apiFetch<{ id: number; full_name: string }>("/users/me", { method: "PUT", token, body: JSON.stringify({ full_name }) })` | Update profile |
| PATCH `/users/me/password` | `storefront/src/lib/storefront-api.ts:56` | `apiFetch<void>("/users/me/password", { method: "PATCH", token, body: JSON.stringify({ current_password, new_password }) })` | Change password |
| DELETE `/users/me` | `storefront/src/lib/storefront-api.ts:59` | `apiFetch<void>("/users/me", { method: "DELETE", token, body: JSON.stringify({ current_password }) })` | Delete account |
| GET `/cart` | `storefront/src/lib/storefront-api.ts:61` | `apiFetch<{ items: CartItem[] }>("/cart", { token })` | Load cart |
| POST `/cart/items` | `storefront/src/lib/storefront-api.ts:64` | `apiFetch<void>("/cart/items", { method: "POST", token, body: JSON.stringify({ product_id, quantity }) })` | Add cart item |
| PUT `/cart/items/{itemId}` | `storefront/src/lib/storefront-api.ts:67` | ``apiFetch<void>(`/cart/items/${itemId}`, { method: "PUT", token, body: JSON.stringify({ quantity }) })`` | Update cart quantity |
| DELETE `/cart/items/{itemId}` | `storefront/src/lib/storefront-api.ts:70` | ``apiFetch<void>(`/cart/items/${itemId}`, { method: "DELETE", token })`` | Remove cart item |
| POST `/orders` | `storefront/src/lib/storefront-api.ts:73` | `apiFetch<{ order_id: number; status: string; shipping_status: string }>("/orders", { method: "POST", token, body: JSON.stringify({ shipping_address }) })` | Create checkout order |
| GET `/orders/my` | `storefront/src/lib/storefront-api.ts:75` | `apiFetch<Paginated<OrderSummary>>("/orders/my", { token })` | Load buyer orders |
| GET `/orders/{id}` | `storefront/src/lib/storefront-api.ts:77` | ``apiFetch<OrderDetail>(`/orders/${id}`, { token })`` | Load buyer order detail |
| GET `/notifications` | `storefront/src/lib/storefront-api.ts:79` | `apiFetch<{ items: NotificationItem[] }>("/notifications", { token })` | Load notifications |
| PATCH `/notifications/{id}/read` | `storefront/src/lib/storefront-api.ts:82` | ``apiFetch<{ id: number; is_read: boolean }>(`/notifications/${id}/read`, { method: "PATCH", token, body: JSON.stringify({ is_read }) })`` | Mark notification read/unread |
| PATCH `/notifications/read-all` | `storefront/src/lib/storefront-api.ts:84` | `apiFetch<{ updated: number }>("/notifications/read-all", { method: "PATCH", token })` | Mark all notifications read |
| DELETE `/notifications/{id}` | `storefront/src/lib/storefront-api.ts:86` | ``apiFetch<void>(`/notifications/${id}`, { method: "DELETE", token })`` | Delete notification |
| POST `/reviews` | `storefront/src/lib/storefront-api.ts:89` | `apiFetch<{ id: number; updated?: boolean }>("/reviews", { method: "POST", token, body: JSON.stringify({ product_id, rating, title, comment }) })` | Create/update product review |
| POST `/reports` | `storefront/src/lib/storefront-api.ts:92` | `apiFetch<{ id: number }>("/reports", { method: "POST", token, body: JSON.stringify({ target_type, target_id, reason }) })` | Submit report |
| GET `/chat/conversations` | `storefront/src/lib/storefront-api.ts:94` | `apiFetch<{ items: ConversationSummary[] }>("/chat/conversations", { token })` | Load buyer chat conversations |
| POST `/chat/conversations` | `storefront/src/lib/storefront-api.ts:97` | `apiFetch<{ id: number }>("/chat/conversations", { method: "POST", token, body: JSON.stringify(payload) })` | Create buyer chat conversation |
| GET `/chat/conversations/{conversationId}/messages` | `storefront/src/lib/storefront-api.ts:100` | ``apiFetch<{ items: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`, { token })`` | Load buyer chat messages |
| POST `/chat/conversations/{conversationId}/messages` | `storefront/src/lib/storefront-api.ts:103` | ``apiFetch<{ id: number }>(`/chat/conversations/${conversationId}/messages`, { method: "POST", token, body: JSON.stringify({ content }) })`` | Send buyer chat message |
| PATCH `/chat/conversations/{conversationId}/read` | `storefront/src/lib/storefront-api.ts:106` | ``apiFetch<{ updated: number }>(`/chat/conversations/${conversationId}/read`, { method: "PATCH", token })`` | Mark buyer chat read |
| POST `/auth/login` | `storefront/src/lib/auth-client.ts:60` | `apiFetch<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })` | Storefront login |
| POST `/auth/register` | `storefront/src/lib/auth-client.ts:63` | `apiFetch<{ id: number; email: string }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name }) })` | Register buyer |
| POST `/auth/verify-otp` | `storefront/src/lib/auth-client.ts:66` | `apiFetch<{ verified: boolean }>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) })` | Verify OTP |
| POST `/auth/resend-verification-otp` | `storefront/src/lib/auth-client.ts:69` | `apiFetch<{ sent: boolean; email: string }>("/auth/resend-verification-otp", { method: "POST", body: JSON.stringify({ email }) })` | Resend OTP |
| GET `/users/me` | `storefront/src/lib/auth-client.ts:71` | `apiFetch<CurrentUser>("/users/me", { token: getAccessToken() })` | Load current auth user |
| GET `/seller/shop` | `storefront/src/lib/seller-api.ts:14` | `apiFetch<SellerShop>("/seller/shop", { token })` | Load seller shop |
| PUT `/seller/shop` | `storefront/src/lib/seller-api.ts:17` | `apiFetch<{ id: number; name: string }>("/seller/shop", { method: "PUT", token, body: JSON.stringify(body) })` | Update seller shop |
| GET `/seller/products?...` | `storefront/src/lib/seller-api.ts:20` | ``apiFetch<SellerPaginated<SellerProduct>>(`/seller/products${queryString({ page: params.page ?? 1, page_size: params.page_size ?? 50 })}`, { token })`` | Load seller products |
| POST `/seller/products` | `storefront/src/lib/seller-api.ts:23` | `apiFetch<{ id: number }>("/seller/products", { method: "POST", token, body: JSON.stringify(body) })` | Create seller product |
| PUT `/seller/products/{id}` | `storefront/src/lib/seller-api.ts:26` | ``apiFetch<void>(`/seller/products/${id}`, { method: "PUT", token, body: JSON.stringify(body) })`` | Update seller product |
| DELETE `/seller/products/{id}` | `storefront/src/lib/seller-api.ts:29` | ``apiFetch<void>(`/seller/products/${id}`, { method: "DELETE", token })`` | Delete seller product |
| POST `/seller/products/{productId}/images?...` | `storefront/src/lib/seller-api.ts:32` | ``apiFetch<{ id: number }>(`/seller/products/${productId}/images${queryString({ url, is_primary: String(isPrimary) })}`, { method: "POST", token })`` | Add product image |
| PATCH `/seller/products/images/{imageId}` | `storefront/src/lib/seller-api.ts:35` | ``apiFetch<{ id: number; is_primary: boolean }>(`/seller/products/images/${imageId}`, { method: "PATCH", token, body: JSON.stringify({ is_primary }) })`` | Set image primary |
| DELETE `/seller/products/images/{imageId}` | `storefront/src/lib/seller-api.ts:38` | ``apiFetch<void>(`/seller/products/images/${imageId}`, { method: "DELETE", token })`` | Delete product image |
| GET `/seller/orders?...` | `storefront/src/lib/seller-api.ts:41` | ``apiFetch<SellerPaginated<SellerOrder>>(`/seller/orders${queryString({ page: params.page ?? 1, page_size: params.page_size ?? 50 })}`, { token })`` | Load seller orders |
| GET `/seller/orders/{id}` | `storefront/src/lib/seller-api.ts:43` | ``apiFetch<SellerOrder>(`/seller/orders/${id}`, { token })`` | Load seller order detail |
| PATCH `/seller/orders/{id}` | `storefront/src/lib/seller-api.ts:46` | ``apiFetch<void>(`/seller/orders/${id}`, { method: "PATCH", token, body: JSON.stringify({ status }) })`` | Update seller order status |
| PATCH `/seller/orders/{id}/shipping` | `storefront/src/lib/seller-api.ts:49` | ``apiFetch<void>(`/seller/orders/${id}/shipping`, { method: "PATCH", token, body: JSON.stringify({ shipping_status, shipping_note }) })`` | Update seller shipping |
| GET `/seller/chat/conversations` | `storefront/src/lib/seller-api.ts:51` | `apiFetch<{ items: ConversationSummary[] }>("/seller/chat/conversations", { token })` | Load seller chat conversations |
| GET `/seller/chat/conversations/{conversationId}/messages` | `storefront/src/lib/seller-api.ts:54` | ``apiFetch<{ items: ChatMessage[] }>(`/seller/chat/conversations/${conversationId}/messages`, { token })`` | Load seller chat messages |
| POST `/seller/chat/conversations/{conversationId}/messages` | `storefront/src/lib/seller-api.ts:57` | ``apiFetch<{ id: number }>(`/seller/chat/conversations/${conversationId}/messages`, { method: "POST", token, body: JSON.stringify({ content }) })`` | Send seller chat message |
| PATCH `/seller/chat/conversations/{conversationId}/read` | `storefront/src/lib/seller-api.ts:60` | ``apiFetch<{ updated: number }>(`/seller/chat/conversations/${conversationId}/read`, { method: "PATCH", token })`` | Mark seller chat read |
| GET `/seller/chatbot-config` | `storefront/src/lib/seller-api.ts:62` | `apiFetch<SellerChatbotConfig>("/seller/chatbot-config", { token })` | Load chatbot config |
| PATCH `/seller/chatbot-config` | `storefront/src/lib/seller-api.ts:65` | `apiFetch<void>("/seller/chatbot-config", { method: "PATCH", token, body: JSON.stringify(body) })` | Update chatbot config |
| GET `/seller/stats?...` | `storefront/src/lib/seller-api.ts:68` | ``apiFetch<SellerStats>(`/seller/stats${queryString(params)}`, { token })`` | Load seller stats |
| WS `/chat/events?token=...` | `storefront/src/lib/chat-events.ts:31` | `openEventSocket(token, "/chat/events", onEvent)` | Subscribe to chat realtime events |
| WS `/account/events?token=...` | `storefront/src/lib/chat-events.ts:35` | `openEventSocket(token, "/account/events", onEvent)` | Subscribe to account/cart/order events |
| POST `/seller-requests` | `storefront/src/app/seller-request/page.tsx:23` | `apiFetch<{ id: number }>("/seller-requests", { method: "POST", token, body: JSON.stringify({ shop_name: shopName, description, contact }) })` | Submit seller request |
| POST `/auth/login` | `admin/src/lib/auth-client.ts:49` | `apiFetch<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })` | Admin login |
| GET `/users/me` | `admin/src/lib/admin-api.ts:13` | `apiFetch<AdminUser>("/users/me", { token })` | Load current admin |
| GET `/admin/metrics` | `admin/src/lib/admin-api.ts:15` | `apiFetch<AdminMetrics>("/admin/metrics", { token })` | Load admin metrics |
| GET `/admin/users?...` | `admin/src/lib/admin-api.ts:18` | ``apiFetch<Paginated<AdminUser>>(`/admin/users${queryString(params)}`, { token })`` | List/filter users |
| PATCH `/admin/users/{id}` | `admin/src/lib/admin-api.ts:21` | ``apiFetch<void>(`/admin/users/${id}`, { method: "PATCH", token, body: JSON.stringify(body) })`` | Update user role/status |
| GET `/admin/seller-requests` | `admin/src/lib/admin-api.ts:23` | `apiFetch<{ items: SellerRequest[] }>("/admin/seller-requests", { token })` | Load seller requests |
| PATCH `/admin/seller-requests/{id}` | `admin/src/lib/admin-api.ts:26` | ``apiFetch<void>(`/admin/seller-requests/${id}`, { method: "PATCH", token, body: JSON.stringify(body) })`` | Approve/reject seller request |
| GET `/admin/reports` | `admin/src/lib/admin-api.ts:28` | `apiFetch<{ items: AdminReport[] }>("/admin/reports", { token })` | Load admin reports |
| PATCH `/admin/reports/{id}` | `admin/src/lib/admin-api.ts:31` | ``apiFetch<void>(`/admin/reports/${id}`, { method: "PATCH", token, body: JSON.stringify({ status }) })`` | Update report status |
| GET `/admin/audit-logs` | `admin/src/lib/admin-api.ts:33` | `apiFetch<{ items: AuditLog[] }>("/admin/audit-logs", { token })` | Load audit logs |
| GET `/admin/logs` | `admin/src/lib/admin-api.ts:35` | `apiFetch<{ items: AuditLog[] }>("/admin/logs", { token })` | Load system logs |
