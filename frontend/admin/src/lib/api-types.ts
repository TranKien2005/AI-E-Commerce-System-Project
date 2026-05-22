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

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type AdminMetrics = {
  users: number;
  orders: number;
  payments: number;
  products: number;
  shops: number;
  pending_seller_requests: number;
  pending_reports: number;
  successful_payments: number;
  revenue: number;
};

export type AdminUser = {
  id: number;
  email: string;
  role: string;
  status: string;
  full_name?: string;
};

export type SellerRequest = {
  id: number;
  user_id: number;
  shop_name: string;
  status: string;
};

export type AdminReport = {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  status: string;
};

export type AuditLog = {
  id: number;
  admin_id?: number;
  action: string;
  target_type: string;
  target_id: number;
  description?: string;
  created_at?: string;
};
