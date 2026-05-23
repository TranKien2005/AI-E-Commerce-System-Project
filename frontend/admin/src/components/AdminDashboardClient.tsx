"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Database, FileWarning, Gauge, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/AdminCharts";
import type { AdminMetrics, AuditLog } from "@/lib/api-types";
import { getAdminMetrics, getSystemLogs } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy } from "@/lib/copy";
import { formatDateTime, formatVnd } from "@/lib/format";

const domains = [
  { title: adminCopy.shell.links.users, href: "/users", text: "Manage buyers, sellers, admins, account status, and access roles." },
  { title: adminCopy.shell.links.sellerRequests, href: "/seller-requests", text: "Review shop applications, contacts, and onboarding decisions." },
  { title: adminCopy.shell.links.reports, href: "/reports", text: "Review marketplace reports, moderation actions, and report status." },
  { title: adminCopy.shell.links.logs, href: "/logs", text: "Monitor audit logs and backend administration events." },
];

export default function AdminDashboardClient() {
  const { token, hydrated } = useAdminToken();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([getAdminMetrics(token), getSystemLogs(token)])
      .then(([metricData, logData]) => {
        setMetrics(metricData);
        setLogs(logData.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [token]);

  if (!hydrated) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div>;
  if (!token) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.signInRequired}</div>;
  if (error) return <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div>;
  if (!metrics) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div>;

  const cards = [
    { label: adminCopy.dashboard.users, value: metrics.users, href: "/users" },
    { label: adminCopy.dashboard.products, value: metrics.products, href: "/metrics" },
    { label: adminCopy.dashboard.orders, value: metrics.orders, href: "/metrics" },
    { label: adminCopy.dashboard.revenue, value: formatVnd(metrics.revenue), href: "/metrics" },
  ];

  const queues = [
    { label: adminCopy.dashboard.pendingSellerRequests, count: metrics.pending_seller_requests, href: "/seller-requests", detail: "Seller applications waiting for review." },
    { label: adminCopy.dashboard.pendingReports, count: metrics.pending_reports, href: "/reports", detail: "Reports waiting for moderation." },
    { label: adminCopy.dashboard.shops, count: metrics.shops, href: "/metrics", detail: "Total shops in the marketplace." },
  ];

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Link key={item.label} href={item.href} className="group rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-8 flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><Gauge size={20} /></div><StatusPill status="normal" /></div>
            <p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-light tracking-tight text-slate-950">{item.value}</p><p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-slate-950">Backend data · open details <ArrowRight size={14} /></p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow mb-2">Work queues</p><h2 className="text-2xl font-light text-slate-950">Queues to review</h2></div><FileWarning /></div><div className="grid gap-3">{queues.map((queue) => <Link key={queue.label} href={queue.href} className="flex items-center justify-between rounded-[1.4rem] border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg"><div><p className="font-semibold text-slate-950">{queue.label}</p><p className="mt-1 text-sm text-slate-500">{queue.detail}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">{queue.count}</span><ArrowRight size={17} /></div></Link>)}</div></section>
        <section className="rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-sm"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-white/35">{adminCopy.dashboard.recentLogs}</p><h2 className="mt-2 text-2xl font-light">Backend events</h2></div><Database /></div><div className="space-y-3">{logs.slice(0, 4).map((log) => <Link href="/logs" key={log.id} className="grid gap-2 rounded-[1.3rem] bg-white/8 p-4 text-sm md:grid-cols-[8rem_1fr_8rem]"><span className="font-bold">{log.action}</span><span className="text-white/75">{log.description || `${log.target_type}#${log.target_id}`}</span><span className="text-white/35">{formatDateTime(log.created_at)}</span></Link>)}</div></section>
      </div>

      <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow mb-2">Management domains</p><h2 className="text-2xl font-light text-slate-950">Detailed admin areas</h2></div><ShieldCheck /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{domains.map((domain) => <Link key={domain.href} href={domain.href} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"><h3 className="text-lg font-semibold text-slate-950">{domain.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{domain.text}</p><p className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-950">Open details <ArrowRight size={16} /></p></Link>)}</div></section>
    </>
  );
}
