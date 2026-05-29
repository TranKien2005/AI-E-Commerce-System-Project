export type PageMeta = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PageMeta;
};

export type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

export type ShopListItem = {
  id: number;
  name: string;
  description: string;
  status?: string;
  product_count?: number;
  sold_count?: number;
  top_product_image?: string | null;
};

export type AiParsed = {
  category?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  sort?: string | null;
  search_query?: string | null;
};

export type MarketplaceSearchResult = {
  shops: Paginated<ShopListItem>;
  products: Paginated<ProductListItem>;
  is_fallback?: boolean;
  ai_parsed?: AiParsed | null;
};

export type ProductListItem = {
  id: number;
  name: string;
  price: number;
  stock: number;
  primary_image: string | null;
  shop_id: number | null;
  shop_name: string | null;
  category_id?: number | null;
  category?: { id: number; name: string } | null;
  avg_rating?: number | null;
  review_count?: number;
  sold_count?: number;
};

export type ProductImage = {
  id: number;
  url: string;
  is_primary: boolean;
  variant?: string;
  source_size?: string;
};

export type ProductVideo = {
  id: number;
  title: string;
  url: string;
  source_user_id: string;
};

export type ProductAttributes = {
  source?: string;
  source_id?: string;
  source_domain?: string;
  source_category?: string;
  brand?: string;
  store?: string;
  features?: string[];
  rating?: number;
  rating_count?: number;
  details?: Record<string, string>;
  normalized_details?: Record<string, string>;
};

export type ProductDetail = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: { id: number; name: string } | null;
  attributes: ProductAttributes | null;
  images: ProductImage[];
  videos: ProductVideo[];
  shop: { id: number; name: string; owner_id?: number | null } | null;
  avg_rating: number | null;
  review_count: number;
};

export type Review = {
  id: number;
  user_id: number;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_votes: number;
};

export type CartItem = {
  item_id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  primary_image: string | null;
  stock: number;
};

export type OrderSummary = {
  id: number;
  status: string;
  payment_status: string;
  total_price: number;
  shipping_status: string | null;
  created_at: string;
};

export type OrderDetail = OrderSummary & {
  shipping_address: string;
  shipping_note: string | null;
  items: { id: number; product_id: number; quantity: number; price: number }[];
};

export type NotificationItem = {
  id: number;
  title?: string;
  content?: string;
  message?: string;
  type?: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationSummary = {
  id: number;
  buyer_id: number;
  seller_id: number;
  seller_name: string;
  shop_id: number | null;
  shop_name: string;
  is_bot_enabled: boolean;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
};

export type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_bot: boolean;
  is_read: boolean;
  created_at: string | null;
};

export type CurrentUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};
