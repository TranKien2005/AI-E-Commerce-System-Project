"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Store, UploadCloud } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-client";

export default function SellerRequestPage() {
  const [token] = useState(() => getAccessToken());
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setMessage("");
    setError("");
    try {
      await apiFetch<{ id: number }>("/seller-requests", { method: "POST", token, body: JSON.stringify({ shop_name: shopName, description, contact }) });
      setMessage("Đã gửi yêu cầu mở cửa hàng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu.");
    }
  };

  if (!token) {
    return (
      <div className="premium-section py-12 pb-24">
        <div className="premium-panel mx-auto max-w-3xl p-10 text-center">
          <h1 className="text-4xl font-light text-slate-950">Cần đăng nhập</h1>
          <p className="mt-4 text-slate-500">Bạn cần đăng nhập trước khi gửi yêu cầu mở cửa hàng.</p>
          <Link href="/auth/login" className="premium-button mt-8">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow mb-4">Become a seller</p>
        <h1 className="mb-6 text-5xl font-light text-slate-950 md:text-7xl">Đăng ký mở cửa hàng</h1>
        <p className="mb-10 text-lg font-light leading-8 text-slate-500">Gửi thông tin cửa hàng để đội ngũ quản trị xem xét. Khi được phê duyệt, tài khoản của bạn có thể truy cập Seller Center.</p>
        {message && <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
        {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white"><Store /></div>
          <input value={shopName} onChange={(event) => setShopName(event.target.value)} className="soft-input" placeholder="Tên cửa hàng" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Mô tả cửa hàng" />
          <input value={contact} onChange={(event) => setContact(event.target.value)} className="soft-input" placeholder="Thông tin liên hệ" />
          <button className="premium-button w-max"><UploadCloud size={18} /> Gửi yêu cầu</button>
        </form>
      </div>
    </div>
  );
}
