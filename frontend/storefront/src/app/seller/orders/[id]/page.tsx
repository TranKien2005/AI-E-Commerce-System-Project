"use client";

import { useParams } from "next/navigation";
import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import { formatVnd } from "@/lib/format";
import { getSellerOrder, updateSellerOrderStatus } from "@/lib/seller-api";
import type { SellerOrder } from "@/lib/seller-types";

export default function SellerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [order, setOrder] = useState<SellerOrder | null>(null);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const accessToken = getAccessToken();
      setToken(accessToken);
      setHydrated(true);
      setLoading(Boolean(accessToken));
    });
  }, []);

  const loadOrder = async () => {
    if (!token) return;
    const data = await getSellerOrder(token, params.id);
    setOrder(data);
    setStatus(data.status);
  };

  useEffect(() => {
    if (!token) return;
    getSellerOrder(token, params.id)
      .then((data) => {
        setOrder(data);
        setStatus(data.status);
        setShippingStatus(data.shipping_status ?? "preparing");
        setShippingNote(data.shipping_note ?? "");
      })
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [params.id, token]);

  const handleStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await updateSellerOrderStatus(token, params.id, status);
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    } finally {
      setSaving(false);
    }
  };

  const statusTransitions: Record<string, string[]> = {
    pending: ["pending", "processing", "cancelled"],
    processing: ["processing", "shipping", "cancelled"],
    shipping: ["shipping", "delivered"],
    delivered: ["delivered"],
    cancelled: ["cancelled"],
  };
  const statusOptions = statusTransitions[order?.status ?? "pending"] ?? [order?.status ?? "pending"];

  return (
    <RoleShell title={sellerCopy.orders.detailTitle(params.id)} eyebrow={sellerCopy.orders.eyebrow} links={sellerLinks}>
      {!hydrated ? <Panel>Đang kiểm tra tài khoản...</Panel> : !token ? <Panel>{sellerCopy.shell.signInText}</Panel> : loading ? <Panel>{sellerCopy.common.loading}</Panel> : !order ? <Panel>{sellerCopy.common.empty}</Panel> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 lg:col-span-2">{error}</div>}
          <section className="premium-panel p-8">
            <h2 className="text-2xl font-light text-slate-950">{sellerCopy.orders.total}: {formatVnd(order.total_price)}</h2>
            <div className="mt-5 space-y-2 text-sm text-slate-500"><p>{sellerCopy.orders.buyer}: {order.buyer_name ?? order.buyer_email ?? `User #${order.user_id}`}</p><p>{sellerCopy.orders.payment}: {order.payment_status}</p><p>{sellerCopy.orders.shippingAddress}: {order.shipping_address}</p></div>
            <div className="mt-6 space-y-3">{order.items.map((item) => <div key={item.id} className="rounded-2xl bg-white/70 p-4 text-sm text-slate-600">Product #{item.product_id} · {item.quantity} × {formatVnd(item.price)}</div>)}</div>
          </section>
          <div className="grid gap-6">
            <form onSubmit={handleStatus} className="premium-panel grid gap-5 p-8"><h2 className="text-2xl font-light text-slate-950">{sellerCopy.orders.updateStatus}</h2><select value={status} onChange={(event) => setStatus(event.target.value)} className="soft-input">{statusOptions.map((value) => <option key={value} value={value}>{sellerCopy.orders.statuses[value as keyof typeof sellerCopy.orders.statuses] ?? value}</option>)}</select><button disabled={saving} className="premium-button w-max disabled:opacity-60"><Save size={18} /> {saving ? "Saving..." : sellerCopy.orders.updateStatus}</button></form>
          </div>
        </div>
      )}
    </RoleShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="premium-panel p-8 text-slate-500">{children}</div>;
}
