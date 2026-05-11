"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminShell";
import { StatusPill } from "@/components/AdminCharts";
import type { AdminReport } from "@/lib/api-types";
import { getAdminReports, updateAdminReport } from "@/lib/admin-api";
import { getAccessToken } from "@/lib/auth-client";

export default function AdminReportsPage() {
  const token = getAccessToken();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState("");

  const loadReports = async () => {
    if (!token) return;
    const data = await getAdminReports(token);
    setReports(data.items);
  };

  useEffect(() => {
    if (!token) return;
    getAdminReports(token)
      .then((data) => setReports(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải báo cáo."));
  }, [token]);

  const resolve = async (report: AdminReport) => {
    if (!token) return;
    await updateAdminReport(token, report.id, "resolved");
    await loadReports();
  };

  return (
    <>
      <AdminPageHeader eyebrow="Moderation" title="Báo cáo vi phạm & xử lý nội dung" description="Trang chi tiết cho admin xem báo cáo thật từ backend và cập nhật trạng thái xử lý." />
      {!token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đăng nhập admin để xem báo cáo.</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : (
        <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
          <div className="grid gap-4">
            {reports.map((report) => (
              <article key={report.id} className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Report #{report.id}</span><StatusPill status={report.status} /></div>
                    <h2 className="text-2xl font-light text-slate-950">{report.target_type}: #{report.target_id}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{report.reason}</p>
                  </div>
                  <button onClick={() => void resolve(report)} className="premium-button px-4 py-2"><CheckCircle size={16}/> Hoàn tất</button>
                </div>
              </article>
            ))}
          </div>
          <aside className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><FileWarning className="mb-5" /><h2 className="text-2xl font-light text-slate-950">Phân tích hàng chờ</h2><div className="mt-5 space-y-4 text-sm"><div className="rounded-2xl bg-amber-50 p-4 text-amber-700">{reports.filter((item) => item.status === "pending").length} báo cáo pending</div></div><Link href="/audit-logs" className="premium-button mt-6 w-full"><AlertTriangle size={17}/> Xem hành động đã ghi</Link></aside>
        </div>
      )}
    </>
  );
}
