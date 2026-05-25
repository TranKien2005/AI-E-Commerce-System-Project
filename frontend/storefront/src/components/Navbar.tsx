"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, ShoppingBag, Store, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clearTokens, clearTokensIfUnauthorized, useAccessToken } from "@/lib/auth-client";
import { openAccountEventSocket } from "@/lib/chat-events";
import { getCart, getCurrentUser, getNotifications } from "@/lib/storefront-api";
import type { CartItem, CurrentUser, NotificationItem } from "@/lib/api-types";
import { formatVnd } from "@/lib/format";
import { safeImageUrl } from "@/lib/image";
import AiSearchOverlay from "./AiSearchOverlay";

const mobileLinks = [
  { href: "/products", label: "Products" },
  { href: "/profile", label: "Profile" },
  { href: "/orders", label: "Orders" },
  { href: "/cart", label: "Cart" },
  { href: "/notifications", label: "Notifications" },
];

type Popover = "notifications" | "cart" | "profile" | null;

export default function Navbar() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { token } = useAccessToken();
  const isLoggedIn = Boolean(token);
  const [activePopover, setActivePopover] = useState<Popover>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setUser(null);
        setNotifications([]);
        setCartItems([]);
        setActivePopover(null);
      });
      return;
    }

    const refreshAccountState = () => {
      Promise.allSettled([getCurrentUser(token), getNotifications(token), getCart(token)]).then(([userResult, notificationsResult, cartResult]) => {
        if (userResult.status === "fulfilled") setUser(userResult.value);
        else clearTokensIfUnauthorized(userResult.reason);
        if (notificationsResult.status === "fulfilled") setNotifications(notificationsResult.value.items);
        if (cartResult.status === "fulfilled") setCartItems(cartResult.value.items);
      });
    };

    refreshAccountState();
    const socket = openAccountEventSocket(token, () => refreshAccountState());
    window.addEventListener("storefront-auth-changed", refreshAccountState);
    window.addEventListener("focus", refreshAccountState);
    return () => {
      socket.close();
      window.removeEventListener("storefront-auth-changed", refreshAccountState);
      window.removeEventListener("focus", refreshAccountState);
    };
  }, [token]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const previewNotifications = notifications.slice(0, 4);
  const previewCart = cartItems.slice(0, 3);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shopHref = user?.role === "seller" || user?.role === "admin" ? "/seller" : "/seller-request";
  const shopLabel = user?.role === "seller" || user?.role === "admin" ? "My Shop" : "Open a shop";

  const togglePopover = (value: Popover) => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    setActivePopover((current) => (current === value ? null : value));
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setActivePopover(null);
    router.push("/");
  };

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
            <span className="block text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Marketplace</span>
          </span>
        </Link>

        <div className="hidden rounded-full border border-white/70 bg-white/55 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400 backdrop-blur-xl lg:block">Buyer marketplace</div>

        <div className="relative flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="premium-icon-button" aria-label="Search">
            <Search size={18} />
          </button>
          <button onClick={() => togglePopover("notifications")} className="premium-icon-button relative" aria-label="Notifications">
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
          </button>
          <button onClick={() => togglePopover("cart")} className="premium-icon-button relative" aria-label="Cart">
            <ShoppingBag size={18} />
            {cartItems.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-white">{cartItems.length}</span>}
          </button>
          <button onClick={() => togglePopover("profile")} className="premium-icon-button" aria-label="Profile">
            <User size={18} />
          </button>
          <button onClick={() => setMenuOpen((value) => !value)} className="premium-icon-button lg:hidden" aria-label="Menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          {activePopover === "notifications" && (
            <div className="absolute right-0 top-14 w-80 max-h-[80vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between"><p className="font-semibold text-slate-950">Notifications</p><span className="text-xs text-slate-400">{unreadCount} unread</span></div>
              <div className="grid gap-2">
                {previewNotifications.length ? previewNotifications.map((item) => (
                  <Link key={item.id} href="/notifications" onClick={() => setActivePopover(null)} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 hover:bg-slate-100">
                    <p className={cn("line-clamp-2", !item.is_read && "font-semibold text-slate-950")}>{item.content || item.message || item.title || "Notification"}</p>
                  </Link>
                )) : <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">No notifications yet.</p>}
              </div>
              <Link href="/notifications" onClick={() => setActivePopover(null)} className="premium-button-light mt-3 w-full py-2">View all notifications</Link>
            </div>
          )}

          {activePopover === "cart" && (
            <div className="absolute right-0 top-14 w-80 max-h-[80vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between"><p className="font-semibold text-slate-950">Cart</p><span className="text-xs text-slate-400">{cartItems.length} items</span></div>
              <div className="grid gap-2">
                {previewCart.length ? previewCart.map((item) => (
                  <Link key={item.item_id} href="/cart" onClick={() => setActivePopover(null)} className="flex gap-3 rounded-2xl bg-slate-50 p-2 hover:bg-slate-100">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white"><Image src={safeImageUrl(item.primary_image)} alt={item.name} fill sizes="48px" className="object-cover" /></div>
                    <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-semibold text-slate-950">{item.name}</p><p className="text-xs text-slate-500">{item.quantity} × {formatVnd(item.price)}</p></div>
                  </Link>
                )) : <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Your cart is empty.</p>}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-slate-950">{formatVnd(cartSubtotal)}</span></div>
              <Link href="/cart" onClick={() => setActivePopover(null)} className="premium-button-light mt-3 w-full py-2">View cart</Link>
            </div>
          )}

          {activePopover === "profile" && (
            <div className="absolute right-0 top-14 w-72 max-h-[80vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-950">{user?.full_name ?? "Account"}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="grid gap-1">
                <Link href="/profile" onClick={() => setActivePopover(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Profile</Link>
                <Link href="/orders" onClick={() => setActivePopover(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Orders</Link>
                <Link href="/cart" onClick={() => setActivePopover(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cart</Link>
                <Link href="/notifications" onClick={() => setActivePopover(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Notifications</Link>
                <Link href={shopHref} onClick={() => setActivePopover(null)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Store size={15} /> {shopLabel}</Link>
                <button onClick={logout} className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={15} /> Sign out</button>
              </div>
            </div>
          )}
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
            <Link href={shopHref} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">{shopLabel}</Link>
          </div>
        </div>
      )}

      <AiSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
