"use client";

import Link from "next/link";
import { CreditCard, PackageCheck, Star, Truck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrderDetail } from "@/lib/api-types";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { formatVnd } from "@/lib/format";
import { getOrder } from "@/lib/storefront-api";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ id }) => setId(id));
    queueMicrotask(() => setToken(getAccessToken()));
  }, [params]);

  useEffect(() => {
    if (!token || !id) return;
    getOrder(token, id)
      .then(setOrder)
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : "Unable to load order.");
      });
  }, [id, token]);

  if (!token) {
    return (
      <div className="premium-section py-12 pb-24">
        <p className="eyebrow mb-4">Order detail</p>
        <div className="premium-panel p-10 text-center">
          <h1 className="text-4xl font-light text-slate-950">Sign in required</h1>
          <p className="mt-4 text-slate-500">Sign in to view your order.</p>
          <Link href="/auth/login" className="premium-button mt-8">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Order #{id}</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Order tracking</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {!order ? <div className="premium-panel p-10 text-slate-500">Loading order...</div> : (
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-6">
            <section className="premium-panel p-8">
              <h2 className="text-2xl font-light text-slate-950">Status timeline</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {[
                  ["pending", "Pending"],
                  ["processing", "Processing"],
                  ["shipping", "Shipping"],
                  ["delivered", "Delivered"],
                ].map(([step, label]) => <div key={step} className="rounded-[1.5rem] bg-white/70 p-5"><PackageCheck className="mb-4 text-slate-950" /><p className="font-semibold text-slate-950">{label}</p><p className="mt-1 text-xs text-slate-500">{order.status === step || order.shipping_status === step ? "Current status" : "Updates when the shop changes status."}</p></div>)}
              </div>
            </section>
            <section className="premium-panel p-8">
              <h2 className="text-2xl font-light text-slate-950">Order items</h2>
              <div className="mt-6 divide-y divide-slate-200">
                {order.items.map((item) => <div key={item.id} className="flex justify-between py-4"><Link href={`/products/${item.product_id}`}>Product #{item.product_id} × {item.quantity}</Link><span className="font-semibold">{formatVnd(item.price * item.quantity)}</span></div>)}
              </div>
            </section>
          </div>
          <aside className="premium-panel h-max p-8">
            <h2 className="text-2xl font-light text-slate-950">Summary</h2>
            <div className="mt-6 space-y-4 text-sm text-slate-500">
              <p className="flex gap-3"><CreditCard size={18} /> Payment: {order.payment_status}</p>
              <p className="flex gap-3"><Truck size={18} /> Shipping: {order.shipping_status ?? order.status}</p>
              <p className="border-t border-slate-200 pt-4 text-lg text-slate-950">Total: <b>{formatVnd(order.total_price)}</b></p>
            </div>
            <button className="premium-button-light mt-6 w-full" disabled><XCircle size={17} /> Cancel if still pending</button>
            <Link href={`/reviews/new?product_id=${order.items[0]?.product_id ?? ""}`} className="premium-button mt-3 w-full"><Star size={17} /> Review product</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
