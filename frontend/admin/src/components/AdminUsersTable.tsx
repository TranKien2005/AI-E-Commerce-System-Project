"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Search, Shield, UserCheck } from "lucide-react";
import { StatusPill } from "@/components/AdminCharts";
import type { AdminUser } from "@/lib/api-types";
import { getAdminUsers, updateAdminUser } from "@/lib/admin-api";
import { useAdminToken } from "@/lib/auth-client";
import { adminCopy, labelFromMap } from "@/lib/copy";

export default function AdminUsersTable() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [error, setError] = useState("");
  const { token, hydrated } = useAdminToken();

  const loadUsers = async () => {
    if (!token) return;
    const data = await getAdminUsers(token, { role: role === "all" ? undefined : role, status: status === "all" ? undefined : status, keyword: query || undefined, page_size: 50 });
    setRows(data.items);
    setSelectedId((value) => value ?? data.items[0]?.id);
  };

  useEffect(() => {
    if (!token) return;
    getAdminUsers(token, { role: role === "all" ? undefined : role, status: status === "all" ? undefined : status, keyword: query || undefined, page_size: 50 })
      .then((data) => {
        setRows(data.items);
        setSelectedId((value) => value ?? data.items[0]?.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : adminCopy.common.error));
  }, [query, role, status, token]);

  const filteredRows = useMemo(() => rows.filter((user) => `${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const selected = filteredRows.find((user) => user.id === selectedId) ?? filteredRows[0];

  const patchUser = async (user: AdminUser, body: { role?: string; status?: string }) => {
    if (!token) return;
    setError("");
    try {
      await updateAdminUser(token, user.id, body);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : adminCopy.common.error);
    }
  };

  if (!hydrated) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Loading admin data...</div>;
  if (!token) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">{adminCopy.common.signInRequired}</div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div>
        {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
        <div className="mb-5 grid gap-3 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-sm md:grid-cols-[1fr_auto_auto]">
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 text-sm text-slate-400"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder={adminCopy.users.search} /></div>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="soft-input w-auto"><option value="all">{adminCopy.users.allRoles}</option><option value="buyer">{adminCopy.roles.buyer}</option><option value="seller">{adminCopy.roles.seller}</option><option value="admin">{adminCopy.roles.admin}</option></select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="soft-input w-auto"><option value="all">{adminCopy.users.allStatuses}</option><option value="active">{adminCopy.statuses.active}</option><option value="banned">{adminCopy.statuses.banned}</option><option value="pending_verification">{adminCopy.statuses.pending_verification}</option></select>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400"><tr><th className="p-5">{adminCopy.users.user}</th><th>{adminCopy.users.role}</th><th>{adminCopy.users.status}</th><th>{adminCopy.users.actions}</th></tr></thead>
            <tbody>{filteredRows.map((user)=><tr key={user.id} onClick={() => setSelectedId(user.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="p-5"><p className="font-semibold text-slate-950">User #{user.id}</p><p className="text-slate-500">{user.email}</p></td><td><span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">{labelFromMap(adminCopy.roles, user.role)}</span></td><td><StatusPill status={user.status === "active" ? "normal" : "ERROR"} /></td><td><div className="flex gap-2">{user.status !== "active" && <button onClick={(event) => { event.stopPropagation(); void patchUser(user, { status: "active" }); }} className="premium-button-light px-3 py-2" title={adminCopy.users.activate}><UserCheck size={15}/></button>}{user.status !== "banned" && <button onClick={(event) => { event.stopPropagation(); void patchUser(user, { status: "banned" }); }} className="premium-button-light px-3 py-2" title={adminCopy.users.ban}><Ban size={15}/></button>}{user.role !== "admin" && <button onClick={(event) => { event.stopPropagation(); void patchUser(user, { role: user.role === "seller" ? "buyer" : "seller" }); }} className="premium-button-light px-3 py-2" title={adminCopy.users.changeRole}><Shield size={15}/></button>}</div></td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <aside className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm"><h2 className="text-2xl font-light text-slate-950">{adminCopy.users.detail}</h2>{selected ? <div className="mt-5 space-y-4 text-sm"><p className="font-semibold text-slate-950">User #{selected.id}</p><p className="text-slate-500">{selected.email}</p><p>{adminCopy.users.role}: <b>{labelFromMap(adminCopy.roles, selected.role)}</b></p><p>{adminCopy.users.status}: <b>{labelFromMap(adminCopy.statuses, selected.status)}</b></p></div> : <p className="mt-3 text-sm text-slate-500">{adminCopy.users.noMatch}</p>}</aside>
    </div>
  );
}
