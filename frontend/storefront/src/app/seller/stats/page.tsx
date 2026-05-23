"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import { formatVnd } from "@/lib/format";
import { getSellerStats } from "@/lib/seller-api";
import type { SellerStats } from "@/lib/seller-types";

export default function SellerStatsPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));

  useEffect(() => {
    if (!token) return;
    getSellerStats(token)
      .then(setStats)
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <RoleShell title={sellerCopy.stats.title} eyebrow={sellerCopy.stats.eyebrow} links={sellerLinks}>
      {!token ? <Panel>{sellerCopy.shell.signInText}</Panel> : loading ? <Panel>{sellerCopy.common.loading}</Panel> : (
        <>
          {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <div className="grid gap-5 md:grid-cols-2">{[[sellerCopy.stats.revenue, formatVnd(stats?.revenue ?? 0)], [sellerCopy.stats.orders, String(stats?.orders ?? 0)]].map(([label,value])=><div key={label} className="premium-panel p-7"><TrendingUp className="mb-5" /><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-light text-slate-950">{value}</p></div>)}</div>
          <div className="premium-panel mt-6 p-8"><BarChart3 className="mb-5" /><h2 className="text-3xl font-light text-slate-950">{sellerCopy.stats.bestSelling}</h2><div className="mt-6 space-y-3">{stats?.best_selling.length ? stats.best_selling.map((product) => <div key={product.id} className="flex justify-between rounded-2xl bg-white/70 p-4 text-sm"><span className="font-semibold text-slate-950">{product.name}</span><span className="text-slate-500">{sellerCopy.stats.sold(product.sold)}</span></div>) : <p className="text-sm text-slate-500">{sellerCopy.common.empty}</p>}</div></div>
        </>
      )}
    </RoleShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="premium-panel p-8 text-slate-500">{children}</div>;
}
