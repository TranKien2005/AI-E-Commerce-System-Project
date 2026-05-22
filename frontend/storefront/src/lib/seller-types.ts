import type { PageMeta } from "./api-types";

export type SellerShop = {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  status: string;
  created_at?: string | null;
};

export type SellerProductImage = {
  id: number;
  url: string;
  is_primary: boolean;
};

export type SellerProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id: number | null;
  attributes?: Record<string, unknown> | null;
  images: SellerProductImage[];
  created_at?: string | null;
};

export type SellerProductInput = {
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id: number | null;
};

export type SellerOrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
};

export type SellerOrder = {
  id: number;
  user_id: number;
  buyer_name: string | null;
  buyer_email: string | null;
  status: string;
  payment_status: string;
  total_price: number;
  shipping_address: string;
  shipping_status: string | null;
  shipping_note: string | null;
  items: SellerOrderItem[];
  created_at?: string | null;
};

export type SellerStats = {
  revenue: number;
  orders: number;
  best_selling: { id: number; name: string; sold: number }[];
};

export type SellerChatbotConfig = {
  api_key: string | null;
  prompt: string;
  template: string;
  is_enabled: boolean;
};

export type SellerPaginated<T> = {
  items: T[];
  meta: PageMeta;
};
