"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, RefreshCw, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("white");
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const images = [
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80&sepia=1",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80&grayscale=1",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80&blur=1",
  ];

  const handleAddToCart = () => {
    setIsAdding(true);
    setTimeout(() => {
      setIsAdding(false);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }, 1200);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="container mx-auto px-6 py-12 md:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        
        {/* Left Column: Thumbnails */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex lg:col-span-1 flex-col gap-4"
        >
          {images.map((img, idx) => (
            <motion.button 
              key={idx} 
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveImgIdx(idx)}
              className={cn(
                "relative aspect-square w-full rounded-2xl overflow-hidden border-2 transition-all duration-300",
                activeImgIdx === idx ? "border-primary shadow-lg shadow-primary/10" : "border-transparent hover:border-border"
              )}
            >
              <Image src={img} alt={`Thumbnail ${idx}`} fill className="object-cover" />
            </motion.button>
          ))}
        </motion.div>

        {/* Middle Column: Main Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-6 relative bg-secondary/30 rounded-[3rem] p-12 flex flex-col items-center justify-center min-h-[500px] border border-border/20"
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeImgIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-[420px] aspect-[4/5]"
            >
              <Image 
                src={images[activeImgIdx]} 
                alt="Aeris A9" 
                fill 
                className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                priority
              />
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
            {images.map((_, idx) => (
              <motion.div 
                key={idx}
                animate={{ 
                  scale: activeImgIdx === idx ? 1.2 : 1,
                  backgroundColor: activeImgIdx === idx ? "var(--primary)" : "var(--border)"
                }}
                className="w-2 h-2 rounded-full" 
              />
            ))}
          </div>

          <motion.div 
            whileHover={{ rotate: 180 }}
            className="absolute top-8 left-8 bg-background/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2.5 text-xs font-semibold border border-border/50 shadow-sm"
          >
            <RefreshCw size={14} className="text-primary" />
            360° VIEW
          </motion.div>

          {/* Mobile Thumbnails */}
          <div className="flex lg:hidden gap-3 mt-12 overflow-x-auto w-full pb-2 no-scrollbar">
            {images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setActiveImgIdx(idx)}
                className={cn(
                  "relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all",
                  activeImgIdx === idx ? "border-primary" : "border-transparent"
                )}
              >
                <Image src={img} alt={`Thumbnail ${idx}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Right Column: Info Panel */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-5 flex flex-col pt-4 lg:pl-12"
        >
          <motion.div variants={itemVariants}>
            <p className="text-xs font-bold text-primary uppercase tracking-[0.25em] mb-4">Mẫu máy mới nhất</p>
            <h1 className="text-4xl md:text-5xl font-light mb-4 tracking-tight">Aeris A9</h1>
            <p className="text-3xl font-light text-foreground/80 mb-12">12.990.000đ</p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-10">
            <p className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Màu sắc: <span className="text-foreground capitalize">{selectedColor}</span></p>
            <div className="flex items-center gap-4">
              {['white', 'gray', 'black'].map((color) => (
                <button 
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center p-0.5",
                    selectedColor === color ? "border-primary scale-110 shadow-lg" : "border-border hover:border-primary/30"
                  )}
                  aria-label={color}
                >
                  <div className={cn(
                    "w-full h-full rounded-full border border-black/5",
                    color === 'white' ? "bg-white" : color === 'gray' ? "bg-[#E5E5EA]" : "bg-[#1C1C1E]"
                  )} />
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-12">
            <p className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Số lượng</p>
            <div className="flex items-center w-40 bg-secondary/30 rounded-full p-1.5 border border-border/30">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-background hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Minus size={18} strokeWidth={1.5} />
              </motion.button>
              <div className="flex-1 text-center font-semibold text-lg overflow-hidden relative h-7">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={quantity}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    {quantity}
                  </motion.span>
                </AnimatePresence>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-background hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Plus size={18} strokeWidth={1.5} />
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-12 bg-secondary/20 p-8 rounded-[2rem] border border-border/30">
            <p className="text-sm font-bold mb-6 uppercase tracking-wider">Thông số kỹ thuật</p>
            <div className="space-y-4">
              {[
                { label: "CADR", value: "400 m³/h" },
                { label: "Diện tích", value: "Lên đến 50m²" },
                { label: "Tiếng ồn", value: "22 - 55 dB" },
                { label: "Bộ lọc", value: "HEPA H13 + Than hoạt tính" }
              ].map((spec, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <span className="text-muted-foreground font-light">{spec.label}</span>
                  <span className="font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-auto">
            <button 
              onClick={handleAddToCart}
              disabled={isAdding}
              className={cn(
                "w-full h-16 rounded-full font-semibold flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl",
                isAdded 
                  ? "bg-emerald-500 text-white" 
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
              )}
            >
              {isAdding ? (
                <Loader2 className="animate-spin" size={24} />
              ) : isAdded ? (
                <>
                  <Check size={24} />
                  Đã thêm thành công
                </>
              ) : (
                <>
                  <ShoppingBag size={22} strokeWidth={1.5} />
                  Thêm vào giỏ hàng
                </>
              )}
            </button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
