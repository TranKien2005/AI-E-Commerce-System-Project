"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      window.location.href = "/profile";
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7]">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={18} strokeWidth={1.5} />
        Trở lại trang chủ
      </Link>

      <div className="w-full max-w-md bg-background rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-10 md:p-12 border border-border/50">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-tight mb-2 text-primary">Aeris</h1>
          <p className="text-muted-foreground font-light">Chào mừng bạn quay trở lại</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} strokeWidth={1.5} />
              <input
                type="email"
                required
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="ten@vi-du.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Mật khẩu</label>
              <Link href="#" className="text-xs text-primary hover:underline">Quên mật khẩu?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} strokeWidth={1.5} />
              <input
                type="password"
                required
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-70"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
            ) : "Đăng nhập"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground">Hoặc tiếp tục với</span></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button className="flex items-center justify-center gap-3 h-12 border border-border rounded-xl hover:bg-secondary transition-colors text-sm font-medium">
            <GitHub size={20} />
            Đăng nhập với Github
          </button>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground font-light">
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">Tạo tài khoản mới</Link>
        </p>
      </div>
    </div>
  );
}
