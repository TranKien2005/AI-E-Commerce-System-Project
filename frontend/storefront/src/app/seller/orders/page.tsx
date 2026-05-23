"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { labelFromMap, sellerCopy } from "@/lib/copy";
import { formatDateTime, formatVnd } from "@/lib/format";
import { getSellerOrders } from "@/lib/seller-api";
import type { SellerOrder } from "@/lib/seller-types";

export default function SellerOrdersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const accessToken = getAccessToken();
      setToken(accessToken);
      setHydrated(true);
      setLoading(Boolean(accessToken));
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    getSellerOrders(token, { page_size: 50 })
      .then((data) => setOrders(data.items))
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <RoleShell title={sellerCopy.orders.title} eyebrow={sellerCopy.orders.eyebrow} links={sellerLinks}>
      {!hydrated ? <Panel>Đang kiểm tra tài khoản...</Panel> : !token ? <Panel>{sellerCopy.shell.signInText}</Panel> : loading ? <Panel>{sellerCopy.common.loading}</Panel> : (
        <div className="grid gap-4">
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          {orders.length === 0 ? <Panel>{sellerCopy.orders.empty}</Panel> : orders.map((order) => (
            <div key={order.id} className="premium-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div><p className="eyebrow">{sellerCopy.orders.detailTitle(order.id)} • {formatDateTime(order.created_at)}</p><h2 className="mt-2 text-2xl font-light text-slate-950">{formatVnd(order.total_price)}</h2><p className="mt-1 text-sm text-slate-500">{labelFromMap(sellerCopy.orders.statuses, order.status)} · {labelFromMap(sellerCopy.orders.shippingStatuses, order.shipping_status)}</p></div>
              <Link href={`/seller/orders/${order.id}`} className="premium-button">Details <ArrowRight size={16} /></Link>
            </div>
          ))}
        </div>
      )}
    </RoleShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="premium-panel p-8 text-slate-500">{children}</div>;
}
