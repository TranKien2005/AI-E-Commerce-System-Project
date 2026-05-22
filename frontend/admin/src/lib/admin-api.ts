import { apiFetch } from "./api-client";
import type { AdminMetrics, AdminReport, AdminUser, AuditLog, Paginated, SellerRequest } from "./api-types";

const queryString = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};

export const getCurrentAdmin = (token: string) => apiFetch<AdminUser>("/users/me", { token });

export const getAdminMetrics = (token: string) => apiFetch<AdminMetrics>("/admin/metrics", { token });

export const getAdminUsers = (token: string, params: Record<string, string | number | undefined> = {}) =>
  apiFetch<Paginated<AdminUser>>(`/admin/users${queryString(params)}`, { token });

export const updateAdminUser = (token: string, id: number, body: { role?: string; status?: string }) =>
  apiFetch<void>(`/admin/users/${id}`, { method: "PATCH", token, body: JSON.stringify(body) });

export const getSellerRequests = (token: string) => apiFetch<{ items: SellerRequest[] }>("/admin/seller-requests", { token });

export const updateSellerRequest = (token: string, id: number, body: { action: "approve" | "reject"; reason?: string }) =>
  apiFetch<void>(`/admin/seller-requests/${id}`, { method: "PATCH", token, body: JSON.stringify(body) });

export const getAdminReports = (token: string) => apiFetch<{ items: AdminReport[] }>("/admin/reports", { token });

export const updateAdminReport = (token: string, id: number, status: string) =>
  apiFetch<void>(`/admin/reports/${id}`, { method: "PATCH", token, body: JSON.stringify({ status }) });

export const getAuditLogs = (token: string) => apiFetch<{ items: AuditLog[] }>("/admin/audit-logs", { token });

export const getSystemLogs = (token: string) => apiFetch<{ items: AuditLog[] }>("/admin/logs", { token });
