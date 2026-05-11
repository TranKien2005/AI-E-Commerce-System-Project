"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrderSummary } from "@/lib/api-types";
import { getOrders } from "@/lib/storefront-api";
import { getAccessToken } from "@/lib/auth-client";
import { formatDateTime, formatVnd } from "@/lib/format";

const labels: Record<string, string> = { pending: "Chờ xử lý", processing: "Đang xử lý", shipping: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy" };

export default function OrdersPage() {
  const [token] = useState(() => getAccessToken());
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));

  useEffect(() => {
    if (!token) return;
    getOrders(token).then((data) => setOrders(data.items)).catch((err) => setError(err instanceof Error ? err.message : "Không thể tải đơn hàng.")).finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return <LoginRequired />;
  }

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Buyer orders</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Đơn hàng của tôi</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {loading ? <div className="premium-panel p-10 text-slate-500">Đang tải đơn hàng...</div> : (
        <div className="grid gap-5">
          {orders.length === 0 ? <div className="premium-panel p-10 text-slate-500">Bạn chưa có đơn hàng.</div> : orders.map((order) => (
            <div key={order.id} className="premium-panel grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white"><Package /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">#{order.id} • {formatDateTime(order.created_at)}</p>
                <h2 className="mt-2 text-2xl font-light text-slate-950">{labels[order.status] ?? order.status} · {formatVnd(order.total_price)}</h2>
                <p className="mt-2 text-sm text-slate-500">payment_status: {order.payment_status} · shipping_status: {order.shipping_status ?? "—"}</p>
              </div>
              <Link href={`/orders/${order.id}`} className="premium-button px-4 py-2">Chi tiết <ArrowRight size={16} /></Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="premium-panel p-10 text-center">
        <h1 className="text-4xl font-light text-slate-950">Cần đăng nhập</h1>
        <p className="mt-4 text-slate-500">Đăng nhập để xem đơn hàng thật.</p>
        <Link href="/auth/login" className="premium-button mt-8">Đăng nhập</Link>
      </div>
    </div>
  );
}
