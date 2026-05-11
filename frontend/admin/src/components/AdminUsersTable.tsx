"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Search, Shield, UserCheck } from "lucide-react";
import { StatusPill } from "@/components/AdminCharts";
import type { AdminUser } from "@/lib/api-types";
import { getAdminUsers, updateAdminUser } from "@/lib/admin-api";
import { getAccessToken } from "@/lib/auth-client";

export default function AdminUsersTable() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [error, setError] = useState("");
  const token = getAccessToken();

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
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải người dùng."));
  }, [role, status, token]);

  const filteredRows = useMemo(() => rows.filter((user) => `${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const selected = filteredRows.find((user) => user.id === selectedId) ?? filteredRows[0];

  const patchUser = async (user: AdminUser, body: { role?: string; status?: string }) => {
    if (!token) return;
    await updateAdminUser(token, user.id, body);
    await loadUsers();
  };

  if (!token) return <div className="rounded-[2rem] bg-white/85 p-8 text-slate-500">Đăng nhập admin để xem dữ liệu thật.</div>;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div>
        {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
        <div className="mb-5 grid gap-3 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-sm md:grid-cols-[1fr_auto_auto]">
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 text-sm text-slate-400"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Tìm email, vai trò..." /></div>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="soft-input w-auto"><option value="all">Mọi vai trò</option><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="admin">Admin</option></select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="soft-input w-auto"><option value="all">Mọi trạng thái</option><option value="active">Active</option><option value="banned">Banned</option><option value="pending_verification">Pending</option></select>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400"><tr><th className="p-5">User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredRows.map((user)=><tr key={user.id} onClick={() => setSelectedId(user.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="p-5"><p className="font-semibold text-slate-950">User #{user.id}</p><p className="text-slate-500">{user.email}</p></td><td><span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">{user.role}</span></td><td><StatusPill status={user.status === "active" ? "normal" : "ERROR"} /></td><td><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); void patchUser(user, { status: "active" }); }} className="premium-button-light px-3 py-2" title="Mở khóa"><UserCheck size={15}/></button><button onClick={(event) => { event.stopPropagation(); void patchUser(user, { status: "banned" }); }} className="premium-button-light px-3 py-2" title="Khóa"><Ban size={15}/></button><button onClick={(event) => { event.stopPropagation(); void patchUser(user, { role: user.role === "seller" ? "buyer" : "seller" }); }} className="premium-button-light px-3 py-2" title="Đổi quyền"><Shield size={15}/></button></div></td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <aside className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
        <h2 className="text-2xl font-light text-slate-950">Chi tiết rà soát</h2>
        {selected ? <div className="mt-5 space-y-4 text-sm"><p className="font-semibold text-slate-950">User #{selected.id}</p><p className="text-slate-500">{selected.email}</p><p>Vai trò: <b>{selected.role}</b></p><p>Trạng thái: <b>{selected.status}</b></p></div> : <p className="mt-3 text-sm text-slate-500">Không có user phù hợp bộ lọc.</p>}
      </aside>
    </div>
  );
}
