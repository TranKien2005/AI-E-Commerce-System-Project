"use client";

import Link from "next/link";
import { Bot, PackageCheck, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { labelFromMap, sellerCopy } from "@/lib/copy";
import { formatVnd } from "@/lib/format";
import { getSellerChatbotConfig, getSellerOrders, getSellerProducts, getSellerStats } from "@/lib/seller-api";
import type { SellerChatbotConfig, SellerOrder, SellerStats } from "@/lib/seller-types";

export default function SellerDashboardPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [chatbot, setChatbot] = useState<SellerChatbotConfig | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));

  useEffect(() => {
    if (!token) return;
    Promise.all([getSellerStats(token), getSellerOrders(token, { page_size: 5 }), getSellerProducts(token, { page_size: 1 }), getSellerChatbotConfig(token)])
      .then(([statsData, ordersData, productsData, chatbotData]) => {
        setStats(statsData);
        setOrders(ordersData.items.filter((order) => order.status === "pending" || order.status === "processing"));
        setProductCount(productsData.meta.total);
        setChatbot(chatbotData);
      })
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <RoleShell title={sellerCopy.shell.title} eyebrow={sellerCopy.shell.eyebrow} links={sellerLinks}>
      {!token ? <SignInRequired /> : loading ? <Panel>{sellerCopy.common.loading}</Panel> : (
        <>
          {error && <ErrorPanel message={error} />}
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [TrendingUp, sellerCopy.dashboard.revenue, formatVnd(stats?.revenue ?? 0)],
              [ShoppingBag, sellerCopy.dashboard.orders, String(stats?.orders ?? 0)],
              [PackageCheck, sellerCopy.dashboard.products, String(productCount)],
            ].map(([Icon, label, value]) => <div key={String(label)} className="premium-panel p-7"><Icon className="mb-6 text-slate-950" /><p className="text-sm text-slate-500">{String(label)}</p><p className="mt-2 text-3xl font-light text-slate-950">{String(value)}</p></div>)}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section className="premium-panel p-8">
              <h2 className="text-3xl font-light text-slate-950">{sellerCopy.dashboard.pendingOrders}</h2>
              <div className="mt-6 space-y-3">
                {orders.length === 0 ? <p className="text-sm text-slate-500">{sellerCopy.dashboard.noPendingOrders}</p> : orders.map((order) => (
                  <Link key={order.id} href={`/seller/orders/${order.id}`} className="flex justify-between rounded-2xl bg-white/70 p-4 text-sm font-semibold text-slate-700">
                    <span>{sellerCopy.orders.detailTitle(order.id)}</span>
                    <span>{labelFromMap(sellerCopy.orders.statuses, order.status)}</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="premium-panel p-8">
              <Bot className="mb-5" />
              <h2 className="text-2xl font-light text-slate-950">{sellerCopy.dashboard.chatbotTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{sellerCopy.dashboard.chatbotText}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{chatbot?.is_enabled ? "Enabled" : "Disabled"}</p>
              <Link href="/seller/chatbot" className="premium-button mt-6 w-full">{sellerCopy.dashboard.configure}</Link>
            </section>
          </div>
          <Link href="/seller/products/new" className="premium-button mt-6"><Plus size={18} /> {sellerCopy.common.addProduct}</Link>
        </>
      )}
    </RoleShell>
  );
}

function SignInRequired() {
  return <Panel><h2 className="text-2xl font-light text-slate-950">{sellerCopy.shell.signInTitle}</h2><p className="mt-3 text-sm text-slate-500">{sellerCopy.shell.signInText}</p><Link href="/auth/login" className="premium-button mt-6">Sign in</Link></Panel>;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="premium-panel p-8 text-slate-500">{children}</div>;
}

function ErrorPanel({ message }: { message: string }) {
  return <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{message}</div>;
}
