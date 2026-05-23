import { apiFetch } from "./api-client";
import type { CartItem, Category, ChatMessage, ConversationSummary, CurrentUser, MarketplaceSearchResult, NotificationItem, OrderDetail, OrderSummary, Paginated, ProductDetail, ProductListItem, Review, ShopListItem } from "./api-types";

export type ProductQuery = {
  q?: string;
  category_id?: string;
  shop_id?: string;
  min_price?: string;
  max_price?: string;
  min_rating?: string;
  sort?: string;
  page?: string;
  page_size?: string;
  shop_page?: string;
  shop_page_size?: string;
};

const queryString = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};

export const getCategories = () => apiFetch<{ items: Category[] }>("/categories");

export const getShops = (params: { q?: string; page?: string; page_size?: string } = {}) =>
  apiFetch<Paginated<ShopListItem>>(`/shops${queryString({ ...params, page_size: params.page_size ?? 12 })}`);

export const getShop = (id: string | number) => apiFetch<ShopListItem>(`/shops/${id}`);

export const getProducts = (params: ProductQuery = {}) =>
  apiFetch<MarketplaceSearchResult>(`/products${queryString({ ...params, page_size: params.page_size ?? 20, shop_page_size: params.shop_page_size ?? 4 })}`);

export const intentSearchProducts = (query: string, page = "1", pageSize = "20") =>
  apiFetch<MarketplaceSearchResult>("/products/intent-search", {
    method: "POST",
    body: JSON.stringify({ query, page: Number(page), page_size: Number(pageSize) }),
  });

export const getRecommendedProducts = (pageSize = 4) => apiFetch<Paginated<ProductListItem>>(`/products/recommend?page_size=${pageSize}`);

export const getProduct = (id: string | number) => apiFetch<ProductDetail>(`/products/${id}`);

export const getProductReviews = (id: string | number) => apiFetch<{ items: Review[] }>(`/products/${id}/reviews`);

export const getCurrentUser = (token: string) => apiFetch<CurrentUser>("/users/me", { token });

export const updateCurrentUser = (token: string, full_name: string) =>
  apiFetch<{ id: number; full_name: string }>("/users/me", { method: "PUT", token, body: JSON.stringify({ full_name }) });

export const changePassword = (token: string, current_password: string, new_password: string) =>
  apiFetch<void>("/users/me/password", { method: "PATCH", token, body: JSON.stringify({ current_password, new_password }) });

export const deleteAccount = (token: string, current_password: string) =>
  apiFetch<void>("/users/me", { method: "DELETE", token, body: JSON.stringify({ current_password }) });

export const getCart = (token: string) => apiFetch<{ items: CartItem[] }>("/cart", { token });

export const addCartItem = (token: string, product_id: number, quantity = 1) =>
  apiFetch<void>("/cart/items", { method: "POST", token, body: JSON.stringify({ product_id, quantity }) });

export const updateCartItem = (token: string, itemId: number, quantity: number) =>
  apiFetch<void>(`/cart/items/${itemId}`, { method: "PUT", token, body: JSON.stringify({ quantity }) });

export const deleteCartItem = (token: string, itemId: number) =>
  apiFetch<void>(`/cart/items/${itemId}`, { method: "DELETE", token });

export const createOrder = (token: string, shipping_address: string) =>
  apiFetch<{ order_id: number; status: string; shipping_status: string }>("/orders", { method: "POST", token, body: JSON.stringify({ shipping_address }) });

export const getOrders = (token: string) => apiFetch<Paginated<OrderSummary>>("/orders/my", { token });

export const getOrder = (token: string, id: string | number) => apiFetch<OrderDetail>(`/orders/${id}`, { token });

export const getNotifications = (token: string) => apiFetch<{ items: NotificationItem[] }>("/notifications", { token });

export const markNotificationRead = (token: string, id: string | number, is_read = true) =>
  apiFetch<{ id: number; is_read: boolean }>(`/notifications/${id}/read`, { method: "PATCH", token, body: JSON.stringify({ is_read }) });

export const markAllNotificationsRead = (token: string) => apiFetch<{ updated: number }>("/notifications/read-all", { method: "PATCH", token });

export const deleteNotification = (token: string, id: string | number) => apiFetch<void>(`/notifications/${id}`, { method: "DELETE", token });

export const createReview = (token: string, product_id: number, rating: number, comment: string, title = "") =>
  apiFetch<{ id: number; updated?: boolean }>("/reviews", { method: "POST", token, body: JSON.stringify({ product_id, rating, title, comment }) });

export const createReport = (token: string, target_type: string, target_id: number, reason: string) =>
  apiFetch<{ id: number }>("/reports", { method: "POST", token, body: JSON.stringify({ target_type, target_id, reason }) });

export const getChatConversations = (token: string) => apiFetch<{ items: ConversationSummary[] }>("/chat/conversations", { token });

export const createChatConversation = (token: string, payload: { seller_id?: number; shop_id?: number }) =>
  apiFetch<{ id: number }>("/chat/conversations", { method: "POST", token, body: JSON.stringify(payload) });

export const getChatMessages = (token: string, conversationId: number) =>
  apiFetch<{ items: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`, { token });

export const sendChatMessage = (token: string, conversationId: number, content: string) =>
  apiFetch<{ id: number }>(`/chat/conversations/${conversationId}/messages`, { method: "POST", token, body: JSON.stringify({ content }) });

export const markConversationRead = (token: string, conversationId: number) =>
  apiFetch<{ updated: number }>(`/chat/conversations/${conversationId}/read`, { method: "PATCH", token });
