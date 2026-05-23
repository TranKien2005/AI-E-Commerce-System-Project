"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ShoppingBag, Store, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import type { AdminMetrics } from "@/lib/api-types";
import { getAdminMetrics } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy } from "@/lib/copy";
import { formatVnd } from "@/lib/format";

export default function AdminMetricsPage() {
  const { token, hydrated } = useAdminToken();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getAdminMetrics(token).then(setMetrics).catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [token]);

  const cards = metrics ? [
    { icon: Users, label: adminCopy.metrics.users, value: metrics.users, text: "Total user accounts." },
    { icon: Store, label: adminCopy.metrics.shops, value: metrics.shops, text: "Total active marketplace shops." },
    { icon: ShoppingBag, label: adminCopy.metrics.orders, value: metrics.orders, text: "Total recorded orders." },
    { icon: CircleDollarSign, label: adminCopy.metrics.revenue, value: formatVnd(metrics.revenue), text: "Total successful payment revenue." },
  ] : [];

  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.metrics.eyebrow} title={adminCopy.metrics.title} description={adminCopy.metrics.description} />
      {!hydrated ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div> : !token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.metrics.signIn}</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : !metrics ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => <div key={card.label} className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><card.icon className="mb-5"/><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-light text-slate-950">{card.value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{card.text}</p></div>)}
        </div>
      )}
    </>
  );
}
