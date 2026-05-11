"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { login, setTokens } from "@/lib/auth-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await login(email, password);
      setTokens(tokens);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_28rem]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-white/35">Administrator access</p>
          <h1 className="mt-6 text-6xl font-light leading-none tracking-tight md:text-8xl">Admin Control Plane</h1>
          <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-white/55">Trang đăng nhập riêng cho quản trị viên, tách biệt khỏi khu vực mua sắm của người dùng thường.</p>
          <Link href="/" className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Về tổng quan</Link>
        </div>
        <form onSubmit={handleSubmit} className="rounded-[2.5rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl md:p-10">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-950"><LockKeyhole size={28} /></div>
          <h2 className="text-3xl font-light">Đăng nhập admin</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">Chỉ tài khoản quản trị hợp lệ mới được truy cập bảng điều khiển hệ thống.</p>
          {error && <div className="mt-6 rounded-2xl bg-rose-500/15 p-4 text-sm font-semibold text-rose-100">{error}</div>}
          <div className="mt-8 grid gap-4">
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm outline-none placeholder:text-white/30" placeholder="admin@example.com" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm outline-none placeholder:text-white/30" type="password" placeholder="Mật khẩu" />
            <button disabled={loading} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white font-semibold text-slate-950 disabled:opacity-60"><ShieldCheck size={18} /> {loading ? "Đang đăng nhập..." : "Vào Admin Console"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
