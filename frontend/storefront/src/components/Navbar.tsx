"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/auth-client";
import AiSearchOverlay from "./AiSearchOverlay";

const buyerLinks = [
  { href: "/products", label: "Sản phẩm" },
  { href: "/orders", label: "Đơn hàng" },
  { href: "/chat", label: "Chat" },
  { href: "/seller-request", label: "Mở cửa hàng" },
];

const mobileLinks = [...buyerLinks, { href: "/seller", label: "Kênh người bán" }];

export default function Navbar() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = (href: string) =>
    cn(
      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
      pathname === href ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-white/80 hover:text-slate-950"
    );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        isScrolled ? "border-b border-white/60 bg-white/75 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-xl shadow-slate-300/60">AI</span>
          <span>
            <span className="block text-lg font-semibold tracking-tight text-slate-950">Aeris Market</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Intent commerce</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/55 p-1 backdrop-blur-xl lg:flex">
          {buyerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="premium-icon-button" aria-label="Tìm kiếm">
            <Search size={18} />
          </button>
          <Link href={isLoggedIn ? "/notifications" : "/auth/login"} className="premium-icon-button relative" aria-label="Thông báo">
            <Bell size={18} />
            {isLoggedIn && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
          </Link>
          <Link href={isLoggedIn ? "/cart" : "/auth/login"} className="premium-icon-button relative" aria-label="Giỏ hàng">
            <ShoppingBag size={18} />
          </Link>
          <Link href={isLoggedIn ? "/profile" : "/auth/login"} className="premium-icon-button" aria-label="Hồ sơ">
            <User size={18} />
          </Link>
          <button onClick={() => setMenuOpen((value) => !value)} className="premium-icon-button lg:hidden" aria-label="Menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/60 bg-white/90 px-4 py-4 backdrop-blur-2xl lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            {mobileLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <AiSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
