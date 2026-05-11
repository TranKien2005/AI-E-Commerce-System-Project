"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ShoppingBag, Store, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import type { AdminMetrics } from "@/lib/api-types";
import { getAdminMetrics } from "@/lib/admin-api";
import { getAccessToken } from "@/lib/auth-client";
import { formatVnd } from "@/lib/format";

export default function AdminMetricsPage() {
  const token = getAccessToken();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getAdminMetrics(token).then(setMetrics).catch((err) => setError(err instanceof Error ? err.message : "Không thể tải metrics."));
  }, []);

  const cards = metrics ? [
    { icon: Users, label: "Người dùng", value: metrics.users, text: "Tổng user trong hệ thống" },
    { icon: Store, label: "Shop", value: metrics.shops, text: "Tổng cửa hàng" },
    { icon: ShoppingBag, label: "Đơn hàng", value: metrics.orders, text: "Tổng đơn đã ghi nhận" },
    { icon: CircleDollarSign, label: "Doanh thu", value: formatVnd(metrics.revenue), text: "Tổng thanh toán thành công" },
  ] : [];

  return (
    <>
      <AdminPageHeader eyebrow="System analytics" title="Thống kê hệ thống" description="Trang chi tiết hiển thị aggregate metrics thật từ backend /admin/metrics." />
      {!token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đăng nhập admin để xem metrics.</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : !metrics ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đang tải metrics...</div> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => <div key={card.label} className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><card.icon className="mb-5"/><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-light text-slate-950">{card.value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{card.text}</p></div>)}
        </div>
      )}
    </>
  );
}
