"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Search, Store, X } from "lucide-react";
import { StatusPill } from "@/components/AdminCharts";
import type { SellerRequest } from "@/lib/api-types";
import { getSellerRequests, updateSellerRequest } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy, labelFromMap } from "@/lib/copy";

export default function AdminSellerRequestsTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<SellerRequest[]>([]);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const { token, hydrated } = useAdminToken();

  const loadRows = async () => {
    if (!token) return;
    const data = await getSellerRequests(token);
    setRows(data.items);
  };

  useEffect(() => {
    if (!token) return;
    getSellerRequests(token)
      .then((data) => setRows(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [token]);

  const filtered = useMemo(() => rows.filter((request) => (status === "all" || request.status === status) && `${request.shop_name} ${request.user_id}`.toLowerCase().includes(query.toLowerCase())), [rows, query, status]);

  const patch = async (request: SellerRequest, action: "approve" | "reject") => {
    if (!token) return;
    setError("");
    try {
      await updateSellerRequest(token, request.id, { action, reason: reasons[request.id] ?? "" });
      setReasons((value) => ({ ...value, [request.id]: "" }));
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : adminCopy.common.error);
    }
  };

  if (!hydrated) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Loading admin data...</div>;
  if (!token) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.signInRequired}</div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
      <div>
        {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
        <div className="mb-5 grid gap-3 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 text-sm text-slate-400"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder={adminCopy.sellerRequests.search} /></div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="soft-input w-auto"><option value="all">{adminCopy.sellerRequests.allStatuses}</option><option value="pending">{adminCopy.statuses.pending}</option><option value="approved">{adminCopy.statuses.approved}</option><option value="rejected">{adminCopy.statuses.rejected}</option></select>
        </div>
        <div className="grid gap-5">
          {filtered.length === 0 ? <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.sellerRequests.empty}</div> : filtered.map((request) => (
            <article key={request.id} className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
              <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
                <div><div className="mb-4 flex flex-wrap items-center gap-3"><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">#{request.id}</span><StatusPill status={request.status} /></div><h2 className="text-3xl font-light text-slate-950">{request.shop_name}</h2><p className="mt-2 text-sm font-semibold text-slate-600">User ID: {request.user_id}</p><div className="mt-5 flex gap-2 text-sm text-slate-600"><Store size={16} /> Backend seller request</div></div>
                <div className="rounded-[1.5rem] bg-slate-50 p-5"><p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950"><FileText size={17} /> {adminCopy.sellerRequests.reason}</p><textarea value={reasons[request.id] ?? ""} onChange={(event) => setReasons((value) => ({ ...value, [request.id]: event.target.value }))} className="mb-3 h-24 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none" placeholder={adminCopy.sellerRequests.reasonPlaceholder} /><div className="grid grid-cols-2 gap-2"><button onClick={() => void patch(request, "approve")} className="premium-button px-3 py-2"><Check size={16}/> {adminCopy.sellerRequests.approve}</button><button onClick={() => void patch(request, "reject")} className="premium-button-light px-3 py-2"><X size={16}/> {adminCopy.sellerRequests.reject}</button></div></div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <aside className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><h2 className="text-2xl font-light text-slate-950">{adminCopy.sellerRequests.criteria}</h2><div className="mt-5 space-y-3 text-sm leading-6 text-slate-500"><p>Review shop identity and account status before approval.</p><p>Approval grants seller workspace access to the user.</p><p className="rounded-2xl bg-slate-50 p-4 font-semibold text-slate-950">Showing {filtered.length} {filtered.length === 1 ? "request" : "requests"} for {labelFromMap(adminCopy.statuses, status === "all" ? null : status)}.</p></div></aside>
    </div>
  );
}
