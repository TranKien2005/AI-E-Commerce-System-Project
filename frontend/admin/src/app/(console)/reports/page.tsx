"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminShell";
import { StatusPill } from "@/components/AdminCharts";
import type { AdminReport } from "@/lib/api-types";
import { getAdminReports, updateAdminReport } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy } from "@/lib/copy";

export default function AdminReportsPage() {
  const { token, hydrated } = useAdminToken();
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
      .catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [token]);

  const resolve = async (report: AdminReport) => {
    if (!token) return;
    await updateAdminReport(token, report.id, "resolved");
    await loadReports();
  };

  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.reports.eyebrow} title={adminCopy.reports.title} description={adminCopy.reports.description} />
      {!hydrated ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div> : !token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.reports.signIn}</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : (
        <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
          <div className="grid gap-4">
            {reports.length === 0 ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.reports.empty}</div> : reports.map((report) => (
              <article key={report.id} className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Report #{report.id}</span><StatusPill status={report.status} /></div><h2 className="text-2xl font-light text-slate-950">{report.target_type}: #{report.target_id}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{report.reason}</p></div><button onClick={() => void resolve(report)} className="premium-button px-4 py-2"><CheckCircle size={16}/> {adminCopy.reports.resolve}</button></div></article>
            ))}
          </div>
          <aside className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><FileWarning className="mb-5" /><h2 className="text-2xl font-light text-slate-950">{adminCopy.reports.pendingQueue}</h2><div className="mt-5 space-y-4 text-sm"><div className="rounded-2xl bg-amber-50 p-4 text-amber-700">{reports.filter((item) => item.status === "pending").length} {adminCopy.reports.pendingReports}</div></div><Link href="/audit-logs" className="premium-button mt-6 w-full"><AlertTriangle size={17}/> {adminCopy.reports.auditLink}</Link></aside>
        </div>
      )}
    </>
  );
}
