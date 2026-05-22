import { apiFetch } from "./api-client";
import type { ChatMessage, ConversationSummary } from "./api-types";
import type { SellerChatbotConfig, SellerOrder, SellerPaginated, SellerProduct, SellerProductInput, SellerShop, SellerStats } from "./seller-types";

const queryString = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};

export const getSellerShop = (token: string) => apiFetch<SellerShop>("/seller/shop", { token });

export const updateSellerShop = (token: string, body: { name: string; description: string }) =>
  apiFetch<{ id: number; name: string }>("/seller/shop", { method: "PUT", token, body: JSON.stringify(body) });

export const getSellerProducts = (token: string, params: { page?: number; page_size?: number } = {}) =>
  apiFetch<SellerPaginated<SellerProduct>>(`/seller/products${queryString({ page: params.page ?? 1, page_size: params.page_size ?? 50 })}`, { token });

export const createSellerProduct = (token: string, body: SellerProductInput) =>
  apiFetch<{ id: number }>("/seller/products", { method: "POST", token, body: JSON.stringify(body) });

export const updateSellerProduct = (token: string, id: string | number, body: SellerProductInput) =>
  apiFetch<void>(`/seller/products/${id}`, { method: "PUT", token, body: JSON.stringify(body) });

export const deleteSellerProduct = (token: string, id: string | number) =>
  apiFetch<void>(`/seller/products/${id}`, { method: "DELETE", token });

export const addSellerProductImage = (token: string, productId: string | number, url: string, isPrimary = false) =>
  apiFetch<{ id: number }>(`/seller/products/${productId}/images${queryString({ url, is_primary: String(isPrimary) })}`, { method: "POST", token });

export const setSellerProductImagePrimary = (token: string, imageId: string | number, is_primary = true) =>
  apiFetch<{ id: number; is_primary: boolean }>(`/seller/products/images/${imageId}`, { method: "PATCH", token, body: JSON.stringify({ is_primary }) });

export const deleteSellerProductImage = (token: string, imageId: string | number) =>
  apiFetch<void>(`/seller/products/images/${imageId}`, { method: "DELETE", token });

export const getSellerOrders = (token: string, params: { page?: number; page_size?: number } = {}) =>
  apiFetch<SellerPaginated<SellerOrder>>(`/seller/orders${queryString({ page: params.page ?? 1, page_size: params.page_size ?? 50 })}`, { token });

export const getSellerOrder = (token: string, id: string | number) => apiFetch<SellerOrder>(`/seller/orders/${id}`, { token });

export const updateSellerOrderStatus = (token: string, id: string | number, status: string) =>
  apiFetch<void>(`/seller/orders/${id}`, { method: "PATCH", token, body: JSON.stringify({ status }) });

export const updateSellerShipping = (token: string, id: string | number, shipping_status: string, shipping_note: string) =>
  apiFetch<void>(`/seller/orders/${id}/shipping`, { method: "PATCH", token, body: JSON.stringify({ shipping_status, shipping_note }) });

export const getSellerChatConversations = (token: string) => apiFetch<{ items: ConversationSummary[] }>("/seller/chat/conversations", { token });

export const getSellerChatMessages = (token: string, conversationId: number) =>
  apiFetch<{ items: ChatMessage[] }>(`/seller/chat/conversations/${conversationId}/messages`, { token });

export const sendSellerChatMessage = (token: string, conversationId: number, content: string) =>
  apiFetch<{ id: number }>(`/seller/chat/conversations/${conversationId}/messages`, { method: "POST", token, body: JSON.stringify({ content }) });

export const markSellerConversationRead = (token: string, conversationId: number) =>
  apiFetch<{ updated: number }>(`/seller/chat/conversations/${conversationId}/read`, { method: "PATCH", token });

export const getSellerChatbotConfig = (token: string) => apiFetch<SellerChatbotConfig>("/seller/chatbot-config", { token });

export const updateSellerChatbotConfig = (token: string, body: SellerChatbotConfig) =>
  apiFetch<void>("/seller/chatbot-config", { method: "PATCH", token, body: JSON.stringify(body) });

export const getSellerStats = (token: string, params: { from_date?: string; to_date?: string } = {}) =>
  apiFetch<SellerStats>(`/seller/stats${queryString(params)}`, { token });
