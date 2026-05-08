"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wind, Cpu, Zap, Headphones, Fan, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const categories = [
    { name: "Máy lọc khí", icon: Wind },
    { name: "Robot hút bụi", icon: Cpu },
    { name: "Đèn thông minh", icon: Zap },
    { name: "Tai nghe", icon: Headphones },
    { name: "Quạt thông minh", icon: Fan },
    { name: "Khác", icon: MoreHorizontal },
  ];

  const featuredProducts = [
    { id: 1, name: "Aeris A9", price: "12.990.000đ", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80" },
    { id: 2, name: "Aeris R-Vac", price: "15.490.000đ", image: "https://images.unsplash.com/photo-1589006093842-8356396e95b0?w=500&q=80" },
    { id: 3, name: "Aeris Aura", price: "2.190.000đ", image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=500&q=80" },
    { id: 4, name: "Aeris Sound", price: "4.590.000đ", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] w-full bg-gradient-to-br from-[#E6E8F4] to-[#FFFFFF] overflow-hidden flex items-center">
        <div className="container mx-auto px-6 grid md:grid-cols-2 items-center h-full relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center space-y-6"
          >
            <h1 className="text-7xl md:text-9xl font-light text-foreground leading-[1.1] tracking-tight">
              Purity in<br /><span className="italic">Motion</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md font-light leading-relaxed">
              Hít thở không khí trong lành tự nhiên ngay tại ngôi nhà của bạn với công nghệ lọc 360° tiên tiến nhất thế giới.
            </p>
            <div className="flex items-center gap-2 pt-4">
              <motion.div initial={{ width: 0 }} animate={{ width: 32 }} transition={{ delay: 0.5, duration: 0.5 }} className="h-1 bg-primary rounded-full"></motion.div>
              <div className="w-2 h-2 bg-border rounded-full"></div>
              <div className="w-2 h-2 bg-border rounded-full"></div>
              <div className="w-2 h-2 bg-border rounded-full"></div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-full flex items-center justify-center"
          >
            <div className="relative w-[300px] h-[400px] md:w-[500px] md:h-[600px]">
              <Image 
                src="https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80" 
                alt="Aeris Air Purifier"
                fill
                className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-1000"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 border-b border-border/40">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center gap-4 overflow-x-auto no-scrollbar py-4 px-2">
            {categories.map((cat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link 
                  href="/products" 
                  className="flex flex-col items-center gap-4 group min-w-[100px]"
                >
                  <motion.div 
                    whileTap={{ scale: 0.92 }}
                    className="w-20 h-20 rounded-[2rem] bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300 group-hover:rounded-2xl"
                  >
                    <cat.icon size={32} strokeWidth={1.25} className="text-foreground group-hover:text-primary transition-colors" />
                  </motion.div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 container mx-auto px-6 overflow-hidden">
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Sản phẩm nổi bật</p>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight">Thế hệ mới</h2>
          </div>
          <Link href="/products" className="group flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors">
            Khám phá tất cả
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
              <ArrowRight size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/products/${product.id}`} className="group block">
                <div className="relative aspect-[3/4] bg-secondary/30 mb-6 overflow-hidden rounded-[2.5rem] border border-transparent group-hover:border-primary/10 transition-all duration-500">
                  <Image 
                    src={product.image} 
                    alt={product.name}
                    fill
                    className="object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-1000 p-8"
                  />
                </div>
                <div className="flex flex-col gap-1 px-2">
                  <h3 className="text-xl font-light text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-muted-foreground font-light">{product.price}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
