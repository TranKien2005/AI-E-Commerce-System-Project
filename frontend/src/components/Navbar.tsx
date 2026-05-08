"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import AiSearchOverlay from "./AiSearchOverlay";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(2); // Mock cart count
  const [hasNotifications, setHasNotifications] = useState(true);

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  return (
    <header 
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-500",
        isScrolled 
          ? "glass py-4 shadow-sm border-b border-border/40" 
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className={cn(
            "text-2xl font-light tracking-tighter transition-colors",
            !isScrolled && isHome ? "text-foreground" : "text-primary"
          )}
        >
          Aeris<span className="font-bold">.</span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-10 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60">
          <Link href="/products" className="hover:text-primary transition-colors">Sản phẩm</Link>
          <Link href="/collections" className="hover:text-primary transition-colors">Bộ sưu tập</Link>
          <Link href="/technology" className="hover:text-primary transition-colors">Công nghệ</Link>
          <Link href="/support" className="hover:text-primary transition-colors">Hỗ trợ</Link>
        </nav>

        {/* Actions */}
        <div className={cn(
          "flex items-center gap-2 md:gap-4",
          "text-foreground"
        )}>
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hover:text-primary transition-all p-2 hover:bg-secondary/50 rounded-full" 
            aria-label="Search"
          >
            <Search size={18} strokeWidth={2} />
          </button>
          
          <Link href="/notifications" className="hover:text-primary transition-all p-2 hover:bg-secondary/50 rounded-full relative" aria-label="Notifications">
            <Bell size={18} strokeWidth={2} />
            {hasNotifications && (
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Link>

          <Link href="/cart" className="hover:text-primary transition-all p-2 hover:bg-secondary/50 rounded-full relative" aria-label="Cart">
            <ShoppingBag size={18} strokeWidth={2} />
            <AnimatePresence mode="popLayout">
              {cartCount > 0 && (
                <motion.span 
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-white font-bold shadow-lg shadow-primary/20"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <Link href="/profile" className="hover:text-primary transition-all p-2 hover:bg-secondary/50 rounded-full" aria-label="Profile">
            <User size={18} strokeWidth={2} />
          </Link>
          
          <button className="hover:text-primary transition-colors p-2" aria-label="Menu">
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <AiSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
