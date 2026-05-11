"use client";

import Link from "next/link";
import { Bell, MessageCircle, Package, Settings, Store, User } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CurrentUser } from "@/lib/api-types";
import { getCurrentUser, updateCurrentUser } from "@/lib/storefront-api";
import { getAccessToken } from "@/lib/auth-client";

export default function ProfilePage() {
  const [token] = useState(() => getAccessToken());
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    getCurrentUser(token)
      .then((data) => {
        setUser(data);
        setFullName(data.full_name);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải hồ sơ."));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    try {
      await updateCurrentUser(token, fullName);
      setUser((value) => value ? { ...value, full_name: fullName } : value);
      setMessage("Đã cập nhật hồ sơ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.");
    }
  };

  if (!token) return <LoginRequired />;

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Account</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Hồ sơ cá nhân</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {message && <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <aside className="premium-panel h-max p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-950 text-white"><User size={32} /></div>
          <h2 className="mt-6 text-2xl font-light text-slate-950">{user?.full_name ?? "Đang tải..."}</h2>
          <p className="mt-2 text-sm text-slate-500">{user?.role ?? "—"} · {user?.status ?? "—"}</p>
          <div className="mt-8 grid gap-2">
            {["Tổng quan", "Đơn hàng", "Thông báo", "Chat", "Seller request"].map((item) => <button key={item} className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-white">{item}</button>)}
          </div>
        </aside>
        <section className="grid gap-6 md:grid-cols-2">
          {[
            [Package, "Đơn hàng", "Theo dõi pending, processing, shipping, delivered.", "/orders"],
            [Bell, "Thông báo", "Cập nhật đơn hàng, seller request và báo cáo.", "/notifications"],
            [MessageCircle, "Tin nhắn", "Chat với seller hoặc chatbot.", "/chat"],
            [Store, "Mở cửa hàng", "Gửi yêu cầu để trở thành seller.", "/seller-request"],
          ].map(([Icon, title, text, href]) => (
            <Link key={String(title)} href={String(href)} className="premium-panel p-8 transition hover:-translate-y-1">
              <Icon size={28} className="mb-6 text-slate-950" />
              <h2 className="text-2xl font-light text-slate-950">{String(title)}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{String(text)}</p>
            </Link>
          ))}
          <form onSubmit={handleSubmit} className="premium-panel grid gap-4 p-8 md:col-span-2">
            <div className="flex items-center gap-3"><Settings /><h2 className="text-2xl font-light text-slate-950">Cập nhật thông tin</h2></div>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="soft-input" />
            <input className="soft-input" value={user?.email ?? ""} disabled />
            <button className="premium-button w-max">Lưu thay đổi</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="premium-panel p-10 text-center">
        <h1 className="text-4xl font-light text-slate-950">Cần đăng nhập</h1>
        <p className="mt-4 text-slate-500">Đăng nhập để xem hồ sơ thật từ backend.</p>
        <Link href="/auth/login" className="premium-button mt-8">Đăng nhập</Link>
      </div>
    </div>
  );
}
