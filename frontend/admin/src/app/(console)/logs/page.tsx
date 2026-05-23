"use client";

import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import type { AuditLog } from "@/lib/api-types";
import { getSystemLogs } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";

export default function AdminLogsPage() {
  const { token, hydrated } = useAdminToken();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getSystemLogs(token).then((data) => setLogs(data.items)).catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [token]);

  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.logs.eyebrow} title={adminCopy.logs.title} description={adminCopy.logs.description} />
      {!hydrated ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div> : !token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.logs.signIn}</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : (
        <section className="rounded-[2.5rem] border border-white/80 bg-slate-950 p-7 text-white shadow-sm"><Terminal className="mb-6"/><div className="space-y-3 font-mono text-sm">{logs.length === 0 ? <div className="rounded-2xl bg-white/8 p-4">{adminCopy.logs.empty}</div> : logs.map((log)=><div key={log.id} className="grid gap-3 rounded-2xl bg-white/8 p-4 md:grid-cols-[10rem_1fr_8rem_10rem]"><span>{log.action}</span><span>{log.description || `${log.target_type}#${log.target_id}`}</span><span className="text-white/45">admin {log.admin_id ?? "—"}</span><span className="text-white/45">{formatDateTime(log.created_at)}</span></div>)}</div></section>
      )}
    </>
  );
}
