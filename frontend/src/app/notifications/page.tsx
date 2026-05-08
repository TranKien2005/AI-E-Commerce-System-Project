"use client";

import { useState } from "react";
import { Check, PackageCheck, Tag, Info, MessageSquare, ArrowRight, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "TẤT CẢ" },
    { id: "orders", label: "ĐƠN HÀNG" },
    { id: "promos", label: "KHUYẾN MÃI" },
    { id: "messages", label: "TIN NHẮN" },
  ];

  const notifications = [
    {
      id: 1,
      type: "order",
      icon: PackageCheck,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      title: "Đơn hàng đã giao thành công",
      preview: "Đơn hàng #ORD-99234 của bạn đã được giao đến địa chỉ thành công. Cảm ơn bạn đã mua sắm tại Aeris!",
      time: "10 phút trước",
      unread: true,
    },
    {
      id: 2,
      type: "promo",
      icon: Tag,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-50",
      title: "Ưu đãi độc quyền: Giảm 20% cho phụ kiện",
      preview: "Nhập mã AERIS20 để được giảm giá 20% cho tất cả màng lọc và phụ kiện chính hãng.",
      time: "2 giờ trước",
      unread: true,
    },
    {
      id: 3,
      type: "update",
      icon: Info,
      iconColor: "text-primary",
      iconBg: "bg-primary/5",
      title: "Cập nhật ứng dụng hệ thống",
      preview: "Ứng dụng Aeris vừa được cập nhật lên phiên bản 2.4.0 với nhiều tính năng mới và cải thiện hiệu năng.",
      time: "Hôm qua",
      unread: false,
    },
    {
      id: 4,
      type: "message",
      icon: MessageSquare,
      iconColor: "text-slate-500",
      iconBg: "bg-slate-50",
      title: "Tin nhắn từ bộ phận Hỗ trợ",
      preview: "Chúng tôi đã tiếp nhận yêu cầu bảo hành của bạn và sẽ phản hồi trong vòng 24 giờ tới.",
      time: "2 ngày trước",
      unread: false,
    },
    {
      id: 5,
      type: "order",
      icon: PackageCheck,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      title: "Xác nhận đơn hàng",
      preview: "Đơn hàng #ORD-88123 của bạn đã được xác nhận và đang trong quá trình đóng gói.",
      time: "5 ngày trước",
      unread: false,
    },
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
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-3xl">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <Bell size={24} strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-light tracking-tight">Thông báo</h1>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border/40 hover:bg-white transition-colors"
        >
          <Check size={14} strokeWidth={3} />
          ĐÁNH DẤU ĐÃ ĐỌC
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-6 mb-10 border-b border-border/20"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-2 py-2 group"
          >
            <span className={cn(
              "text-[10px] font-bold tracking-[0.2em] transition-colors",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabNotif"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Notifications List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        <AnimatePresence mode="popLayout">
          {notifications.map((notif) => (
            <motion.div 
              key={notif.id} 
              variants={itemVariants}
              layout
              whileHover={{ scale: 1.01, x: 10 }}
              className={cn(
                "flex gap-6 p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden",
                notif.unread 
                  ? "bg-white border-primary/20 shadow-xl shadow-primary/5" 
                  : "bg-secondary/20 border-border/40 hover:bg-white hover:border-border/80"
              )}
            >
              {notif.unread && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              )}
              
              <div className={cn(
                "w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center shadow-sm",
                notif.iconBg,
                notif.iconColor
              )}>
                <notif.icon size={24} strokeWidth={2} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className={cn(
                    "text-lg truncate tracking-tight",
                    notif.unread ? 'font-bold text-foreground' : 'font-light text-foreground'
                  )}>
                    {notif.title}
                  </h3>
                  <span className={cn(
                    "text-[10px] font-bold whitespace-nowrap pt-1 uppercase tracking-widest",
                    notif.unread ? 'text-primary' : 'text-muted-foreground/50'
                  )}>
                    {notif.time}
                  </span>
                </div>
                <p className={cn(
                  "text-sm font-light leading-relaxed line-clamp-2",
                  notif.unread ? 'text-foreground/80' : 'text-muted-foreground'
                )}>
                  {notif.preview}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 flex justify-center"
      >
        <button className="flex items-center gap-3 px-8 py-4 bg-background border border-border/40 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-all group">
          TẢI THÊM THÔNG BÁO
          <ArrowRight size={16} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
}
