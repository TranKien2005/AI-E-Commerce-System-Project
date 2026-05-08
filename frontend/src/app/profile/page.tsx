"use client";

import Image from "next/image";
import Link from "next/link";
import { User, Package, Heart, MapPin, CreditCard, Settings, LogOut, QrCode, ArrowRight, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const menuItems = [
    { icon: User, label: "Tổng quan", active: true },
    { icon: Package, label: "Đơn hàng của tôi", active: false },
    { icon: Heart, label: "Sản phẩm yêu thích", active: false },
    { icon: MapPin, label: "Địa chỉ đã lưu", active: false },
    { icon: CreditCard, label: "Thanh toán", active: false },
    { icon: Settings, label: "Cài đặt", active: false },
    { icon: LogOut, label: "Đăng xuất", active: false, destructive: true },
  ];

  const timelineSteps = [
    { label: "Đặt hàng", completed: true },
    { label: "Xác nhận", completed: true },
    { label: "Đóng gói", completed: true },
    { label: "Đang giao", completed: false, current: true },
    { label: "Tới nơi", completed: false },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="container mx-auto px-6 py-12 lg:py-16">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Left Column: Sidebar */}
        <aside className="w-full lg:w-72 shrink-0">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-2"
          >
            {menuItems.map((item, index) => (
              <motion.button 
                key={index}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all",
                  item.active 
                    ? "bg-primary text-white shadow-xl shadow-primary/20" 
                    : item.destructive 
                      ? "text-destructive hover:bg-destructive/5" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon size={18} strokeWidth={2} />
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        </aside>

        {/* Right Column: Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 space-y-12"
        >
          
          {/* Profile Card */}
          <motion.div 
            variants={itemVariants}
            className="bg-secondary/30 backdrop-blur-sm rounded-[3rem] p-8 md:p-12 flex flex-col sm:flex-row items-center sm:items-start gap-8 border border-border/20 relative overflow-hidden"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative w-32 h-32 rounded-full overflow-hidden border-8 border-background shrink-0 shadow-2xl"
            >
              <Image 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80" 
                alt="Avatar" 
                fill 
                className="object-cover"
              />
            </motion.div>
            <div className="flex-1 text-center sm:text-left pt-4">
              <h1 className="text-3xl md:text-4xl font-light text-foreground mb-2 tracking-tight">Nguyễn Minh Anh</h1>
              <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest">THÀNH VIÊN PLATINUM • #AERIS-8942</p>
              <div className="inline-flex items-center px-5 py-2 bg-background/50 rounded-full text-xs font-bold border border-border/50 uppercase tracking-widest">
                Tham gia T5/2023
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="hidden sm:flex absolute top-12 right-12 w-14 h-14 bg-background rounded-2xl items-center justify-center border border-border/50 text-foreground hover:bg-primary hover:text-white transition-all shadow-xl cursor-pointer"
            >
              <QrCode size={28} strokeWidth={1.5} />
            </motion.button>
          </motion.div>

          {/* Stats Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Đơn hàng", val: "12" },
              { label: "Yêu thích", val: "03" },
              { label: "Địa chỉ", val: "02" },
              { label: "Voucher", val: "01" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="bg-background border border-border/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/[0.02]"
              >
                <span className="text-4xl font-light text-foreground tracking-tighter mb-2">{stat.val}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Recent Order */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-2xl font-light tracking-tight">Đơn hàng gần đây</h2>
              <Link href="#" className="text-xs font-bold text-primary uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center">
                XEM TẤT CẢ
                <ChevronRight size={16} strokeWidth={2} className="ml-1" />
              </Link>
            </div>
            
            <div className="bg-background border border-border/40 rounded-[3rem] p-8 md:p-10 shadow-xl shadow-black/[0.03]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 border-b border-border/40 pb-8 mb-10">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">MÃ ĐƠN HÀNG: <span className="text-foreground">#ORD-99234</span></p>
                  <p className="text-sm font-light">Dự kiến giao: <span className="font-bold">10/05/2026</span></p>
                </div>
                <div className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center self-start sm:self-auto border border-emerald-100 shadow-sm shadow-emerald-500/5">
                  <Clock size={14} className="mr-2" />
                  Đang giao hàng
                </div>
              </div>

              <div className="flex items-center gap-6 mb-12">
                <div className="relative w-24 h-24 bg-secondary/30 rounded-2xl overflow-hidden border border-border/20 shrink-0">
                  <Image src="https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&q=80" alt="Product" fill className="object-cover mix-blend-multiply p-2" />
                </div>
                <div>
                  <h3 className="text-xl font-light tracking-tight">Aeris A9 (Trắng)</h3>
                  <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">SỐ LƯỢNG: 01</p>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="relative mt-12 mb-4 px-2">
                <div className="absolute top-4 left-6 right-6 h-[2px] bg-secondary/50 -z-10"></div>
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 1 }}
                  className="absolute top-4 left-6 h-[2px] bg-primary -z-10"
                />
                
                <div className="flex justify-between">
                  {timelineSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-4 bg-background px-2">
                      {step.completed ? (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1 + idx * 0.2 }}
                          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
                        >
                          <CheckCircle2 size={18} strokeWidth={2.5} />
                        </motion.div>
                      ) : step.current ? (
                        <div className="w-8 h-8 rounded-full bg-primary shadow-xl shadow-primary/30 flex items-center justify-center ring-4 ring-primary/10">
                          <motion.div 
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-2.5 h-2.5 rounded-full bg-white" 
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border/40" />
                      )}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors",
                        step.current ? "text-primary" : step.completed ? "text-foreground" : "text-muted-foreground/50"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
