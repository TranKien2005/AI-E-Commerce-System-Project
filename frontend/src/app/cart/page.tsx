"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, Truck, ShieldCheck, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const [items, setItems] = useState([
    {
      id: 1,
      name: "Aeris A9",
      color: "Trắng",
      price: 12990000,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80"
    },
    {
      id: 2,
      name: "Aeris Fan Pro",
      color: "Đen",
      price: 6990000,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1599598425947-3300262174fc?w=500&q=80"
    }
  ]);

  const updateQuantity = (id: number, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0;
  const total = subtotal + shipping;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price).replace('₫', 'đ');
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-12 group">
          <ArrowLeft size={16} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
          Tiếp tục mua hàng
        </Link>
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-light mb-16 tracking-tight"
      >
        Giỏ hàng
      </motion.h1>

      <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
        {/* Left Column: Items */}
        <div className="w-full lg:w-3/5">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center"
              >
                <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} className="text-muted-foreground/50" />
                </div>
                <p className="text-xl text-muted-foreground font-light mb-8">Giỏ hàng của bạn đang trống.</p>
                <Link href="/products" className="inline-flex h-12 px-8 items-center justify-center rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all">
                  Khám phá ngay
                </Link>
              </motion.div>
            ) : (
              <div className="flex flex-col">
                {items.map((item, idx) => (
                  <motion.div 
                    layout
                    key={item.id} 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: idx * 0.1,
                      ease: [0.22, 1, 0.36, 1] 
                    }}
                    className="flex gap-6 sm:gap-10 py-10 border-b border-border/40 last:border-0"
                  >
                    <Link href={`/products/${item.id}`} className="shrink-0 group">
                      <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-secondary/30 rounded-3xl overflow-hidden border border-border/10 transition-transform duration-500 group-hover:scale-105">
                        <Image src={item.image} alt={item.name} fill className="object-cover mix-blend-multiply" />
                      </div>
                    </Link>
                    
                    <div className="flex flex-col flex-1 pt-2">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div>
                          <Link href={`/products/${item.id}`} className="text-xl sm:text-2xl font-light hover:text-primary transition-colors tracking-tight">
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-2 font-medium tracking-wide">MÀU: {item.color}</p>
                        </div>
                        <p className="text-xl font-light whitespace-nowrap">{formatPrice(item.price)}</p>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center bg-secondary/40 rounded-full p-1 border border-border/30">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-primary hover:text-white transition-all shadow-sm"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} strokeWidth={1.5} />
                          </motion.button>
                          <div className="w-12 text-center text-sm font-bold">{item.quantity}</div>
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-primary hover:text-white transition-all shadow-sm"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} strokeWidth={1.5} />
                          </motion.button>
                        </div>
                        
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeItem(item.id)}
                          className="p-3 text-muted-foreground hover:text-destructive transition-all rounded-full hover:bg-destructive/10"
                          aria-label="Remove item"
                        >
                          <Trash2 size={20} strokeWidth={1.5} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Info Chips */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 flex flex-wrap gap-4"
          >
            {[
              { icon: Truck, text: "Miễn phí vận chuyển" },
              { icon: ShieldCheck, text: "Bảo hành 24 tháng" },
              { icon: RefreshCcw, text: "Đổi trả trong 30 ngày" }
            ].map((chip, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 bg-secondary/40 backdrop-blur-sm rounded-full text-xs font-bold tracking-wider text-muted-foreground border border-border/30">
                <chip.icon size={16} strokeWidth={1.5} className="text-primary" />
                {chip.text.toUpperCase()}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Summary */}
        <div className="w-full lg:w-2/5">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="sticky top-28 bg-background/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-border/40 shadow-[0_20px_80px_rgba(0,0,0,0.05)]"
          >
            <h2 className="text-2xl font-light mb-10 tracking-tight">Tổng thanh toán</h2>
            
            <div className="space-y-6 text-sm mb-10">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-light">Tạm tính</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-light">Phí vận chuyển</span>
                <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">MIỄN PHÍ</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground font-light">Mã giảm giá</span>
                <button className="text-primary font-bold text-xs uppercase tracking-widest hover:opacity-70 transition-opacity">THÊM MÃ</button>
              </div>
            </div>
            
            <div className="border-t border-border/60 pt-8 mb-12">
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-light">Tổng cộng</span>
                <span className="text-4xl font-light tracking-tighter">{formatPrice(total)}</span>
              </div>
            </div>
            
            <Link href="/checkout" className="w-full h-16 bg-primary text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 hover:opacity-90 transition-all shadow-xl shadow-primary/20 group">
              Thanh toán ngay
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowRight size={18} strokeWidth={2} />
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
