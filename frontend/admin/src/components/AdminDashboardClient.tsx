"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Database, FileWarning, Gauge, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/AdminCharts";
import type { AdminMetrics, AuditLog } from "@/lib/api-types";
import { getAdminMetrics, getSystemLogs } from "@/lib/admin-api";
import { getAccessToken } from "@/lib/auth-client";
import { formatDateTime, formatVnd } from "@/lib/format";

const domains = [
  { title: "Người dùng & phân quyền", href: "/users", text: "Quản lý buyer, seller, admin, trạng thái khóa/mở và quyền truy cập." },
  { title: "Seller onboarding", href: "/seller-requests", text: "Duyệt hồ sơ mở cửa hàng, thông tin liên hệ và lịch sử xét duyệt." },
  { title: "Kiểm duyệt báo cáo", href: "/reports", text: "Xem báo cáo vi phạm, hành động xử lý và trạng thái." },
  { title: "Hạ tầng & nhật ký", href: "/logs", text: "Theo dõi audit log và sự kiện quản trị từ backend." },
];

export default function AdminDashboardClient() {
  const token = getAccessToken();
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
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải dashboard."));
  }, []);

  if (!token) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đăng nhập admin để xem dashboard thật.</div>;
  if (error) return <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div>;
  if (!metrics) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đang tải metrics từ backend...</div>;

  const cards = [
    { label: "Users", value: metrics.users, href: "/users" },
    { label: "Products", value: metrics.products, href: "/metrics" },
    { label: "Orders", value: metrics.orders, href: "/metrics" },
    { label: "Revenue", value: formatVnd(metrics.revenue), href: "/metrics" },
  ];

  const queues = [
    { label: "Yêu cầu mở cửa hàng", count: metrics.pending_seller_requests, href: "/seller-requests", detail: "Hồ sơ seller đang chờ duyệt" },
    { label: "Báo cáo vi phạm", count: metrics.pending_reports, href: "/reports", detail: "Báo cáo đang chờ xử lý" },
    { label: "Shops", count: metrics.shops, href: "/metrics", detail: "Tổng số shop trong hệ thống" },
  ];

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Link key={item.label} href={item.href} className="group rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><Gauge size={20} /></div>
              <StatusPill status="normal" />
            </div>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-light tracking-tight text-slate-950">{item.value}</p>
            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-slate-950">Dữ liệu backend · xem chi tiết <ArrowRight size={14} /></p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between"><div><p className="eyebrow mb-2">Work queues</p><h2 className="text-2xl font-light text-slate-950">Hàng chờ cần xử lý</h2></div><FileWarning /></div>
          <div className="grid gap-3">
            {queues.map((queue) => (
              <Link key={queue.label} href={queue.href} className="flex items-center justify-between rounded-[1.4rem] border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div><p className="font-semibold text-slate-950">{queue.label}</p><p className="mt-1 text-sm text-slate-500">{queue.detail}</p></div>
                <div className="flex items-center gap-3"><span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">{queue.count}</span><ArrowRight size={17} /></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-sm">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-white/35">Recent audit logs</p><h2 className="mt-2 text-2xl font-light">Log mới từ backend</h2></div><Database /></div>
          <div className="space-y-3">
            {logs.slice(0, 4).map((log) => (
              <Link href="/logs" key={log.id} className="grid gap-2 rounded-[1.3rem] bg-white/8 p-4 text-sm md:grid-cols-[8rem_1fr_8rem]">
                <span className="font-bold">{log.action}</span><span className="text-white/75">{log.description || `${log.target_type}#${log.target_id}`}</span><span className="text-white/35">{formatDateTime(log.created_at)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between"><div><p className="eyebrow mb-2">Management domains</p><h2 className="text-2xl font-light text-slate-950">Khu vực quản trị chi tiết</h2></div><ShieldCheck /></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {domains.map((domain) => (
            <Link key={domain.href} href={domain.href} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg">
              <h3 className="text-lg font-semibold text-slate-950">{domain.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{domain.text}</p>
              <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-950">Mở trang chi tiết <ArrowRight size={16} /></p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
