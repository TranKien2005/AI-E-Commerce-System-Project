"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import type { AuditLog } from "@/lib/api-types";
import { getAuditLogs } from "@/lib/admin-api";
import { getAccessToken } from "@/lib/auth-client";

export default function AdminAuditLogsPage() {
  const token = getAccessToken();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getAuditLogs(token).then((data) => setLogs(data.items)).catch((err) => setError(err instanceof Error ? err.message : "Không thể tải audit logs."));
  }, []);

  return (
    <>
      <AdminPageHeader eyebrow="Audit trail" title="Nhật ký hành động quản trị" description="Dữ liệu audit log thật từ backend, dùng để truy vết thao tác admin." />
      {!token ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đăng nhập admin để xem audit log.</div> : error ? <div className="rounded-[2rem] bg-rose-50 p-8 text-rose-700">{error}</div> : (
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><ScrollText className="mb-6"/><div className="space-y-4">{logs.map((log)=><div key={log.id} className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-5 md:grid-cols-[12rem_1fr_8rem]"><div><p className="font-semibold text-slate-950">{log.action}</p><p className="text-sm text-slate-500">Log #{log.id}</p></div><div><p className="font-semibold text-slate-700">{log.target_type}#{log.target_id}</p><p className="text-sm text-slate-500">{log.description || "Không có mô tả."}</p></div><p className="text-sm text-slate-400">admin {log.admin_id ?? "—"}</p></div>)}</div></div>
      )}
    </>
  );
}
