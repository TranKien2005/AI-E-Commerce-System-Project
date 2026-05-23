"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import type { AuditLog } from "@/lib/api-types";
import { getAuditLogs } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";

export default function AdminAuditLogsPage() {
  const { token, hydrated } = useAdminToken();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getAuditLogs(token).then((data) => setLogs(data.items)).catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [token]);

  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.shell.links.auditTrail} title={adminCopy.logs.auditTitle} description={adminCopy.logs.auditDescription} />
      {!hydrated ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.loading}</div> : !token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.logs.signIn}</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : (
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><ScrollText className="mb-6"/><div className="space-y-4">{logs.length === 0 ? <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">{adminCopy.logs.empty}</div> : logs.map((log)=><div key={log.id} className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-5 md:grid-cols-[12rem_1fr_8rem_10rem]"><div><p className="font-semibold text-slate-950">{log.action}</p><p className="text-sm text-slate-500">Log #{log.id}</p></div><div><p className="font-semibold text-slate-700">{log.target_type}#{log.target_id}</p><p className="text-sm text-slate-500">{log.description || "No description."}</p></div><p className="text-sm text-slate-400">admin {log.admin_id ?? "—"}</p><p className="text-sm text-slate-400">{formatDateTime(log.created_at)}</p></div>)}</div></div>
      )}
    </>
  );
}
