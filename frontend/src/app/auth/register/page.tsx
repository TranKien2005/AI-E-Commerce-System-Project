"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, User, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
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
          <p className="text-muted-foreground font-light">Bắt đầu hành trình tinh khiết của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Họ và tên</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} strokeWidth={1.5} />
              <input 
                type="text" 
                required
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Nguyễn Văn A"
              />
            </div>
          </div>

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
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} strokeWidth={1.5} />
              <input 
                type="password" 
                required
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Tối thiểu 8 ký tự"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/20" required id="terms" />
            </div>
            <label htmlFor="terms" className="text-xs text-muted-foreground font-light leading-relaxed">
              Tôi đồng ý với <Link href="#" className="text-primary hover:underline">Điều khoản dịch vụ</Link> và <Link href="#" className="text-primary hover:underline">Chính sách bảo mật</Link> của Aeris.
            </label>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-70 mt-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
            ) : "Tạo tài khoản"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground font-light">
            Đã có tài khoản?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Đăng nhập ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
