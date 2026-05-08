"use client";

import Image from "next/image";
import Link from "next/link";
import { Filter, ChevronDown, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const [addedItems, setAddedItems] = useState<number[]>([]);

  const products = [
    { id: 1, name: "Aeris A9", price: "12.990.000đ", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80" },
    { id: 2, name: "Aeris R-Vac", price: "15.490.000đ", image: "https://images.unsplash.com/photo-1589006093842-8356396e95b0?w=500&q=80" },
    { id: 3, name: "Aeris Aura", price: "2.190.000đ", image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=500&q=80" },
    { id: 4, name: "Aeris Sound", price: "4.590.000đ", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80" },
    { id: 5, name: "Aeris Fan Pro", price: "6.990.000đ", image: "https://images.unsplash.com/photo-1599598425947-3300262174fc?w=500&q=80" },
    { id: 6, name: "Aeris Light", price: "1.290.000đ", image: "https://images.unsplash.com/photo-1513506003901-1e6a229e9d15?w=500&q=80" },
    { id: 7, name: "Aeris Cam", price: "2.590.000đ", image: "https://images.unsplash.com/photo-1557825835-b65fb7ba82c3?w=500&q=80" },
    { id: 8, name: "Aeris Humidifier", price: "3.490.000đ", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80" },
  ];

  const handleAddToCart = (id: number) => {
    setAddedItems(prev => [...prev, id]);
    setTimeout(() => {
      setAddedItems(prev => prev.filter(item => item !== id));
    }, 1500);
  };

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Header & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-5xl md:text-6xl font-light mb-4 tracking-tight">Sản phẩm</h1>
        <p className="text-muted-foreground font-light max-w-lg">Khám phá hệ sinh thái thiết bị gia dụng thông minh, nơi thiết kế tối giản gặp gỡ hiệu năng vượt trội.</p>
      </motion.div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 border-b border-border/40 pb-8">
        <div className="flex flex-wrap items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/10"
          >
            <Filter size={18} strokeWidth={1.5} />
            Bộ lọc
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-border bg-background text-sm font-medium hover:border-primary/50 transition-all"
          >
            Tất cả danh mục
            <ChevronDown size={18} strokeWidth={1.5} className="text-muted-foreground" />
          </motion.button>
        </div>

        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
        >
          Sắp xếp: Mới nhất
          <ChevronDown size={18} strokeWidth={1.5} className="text-muted-foreground" />
        </motion.button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-20">
        {products.map((product, idx) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group relative"
          >
            <Link href={`/products/${product.id}`} className="block">
              <div className="relative aspect-[3/4] bg-secondary/40 rounded-[2rem] mb-6 overflow-hidden border border-transparent group-hover:border-primary/5 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-slate-200">
                <Image 
                  src={product.image} 
                  alt={product.name}
                  fill
                  className="object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-1000 p-8"
                />
              </div>
              <div className="flex flex-col gap-1 pr-12 px-2">
                <h3 className="text-xl font-light text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                <p className="text-muted-foreground font-light">{product.price}</p>
              </div>
            </Link>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddToCart(product.id)}
              className={cn(
                "absolute bottom-0 right-0 w-12 h-12 rounded-full border flex items-center justify-center transition-all z-10 translate-y-2 -translate-x-2 shadow-lg",
                addedItems.includes(product.id)
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-background border-border text-foreground hover:bg-primary hover:text-white hover:border-primary"
              )}
              aria-label="Add to cart"
            >
              <AnimatePresence mode="wait">
                {addedItems.includes(product.id) ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 45 }}
                  >
                    <Check size={24} strokeWidth={2} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="plus"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Plus size={24} strokeWidth={1.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
