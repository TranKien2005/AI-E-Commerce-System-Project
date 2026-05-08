"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, CreditCard, Truck, ShieldCheck, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = ["Giỏ hàng", "Địa chỉ", "Thanh toán", "Hoàn tất"];

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1); // Start at Address step
  const [isProcessing, setIsProcessing] = useState(false);

  const orderItems = [
    {
      id: 1,
      name: "Aeris A9",
      price: 12990000,
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&q=80"
    },
    {
      id: 2,
      name: "Aeris Fan Pro",
      price: 6990000,
      image: "https://images.unsplash.com/photo-1599598425947-3300262174fc?w=200&q=80"
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price).replace('₫', 'đ');
  };

  const nextStep = () => {
    if (currentStep === 2) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep(3);
      }, 2000);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(0, prev - 1));

  return (
    <div className="container mx-auto px-6 py-12 mb-20 max-w-7xl">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-light mb-16 text-center tracking-tight"
      >
        Thanh toán
      </motion.h1>

      {/* Stepper */}
      <div className="max-w-3xl mx-auto mb-20 relative">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-[18px] w-full h-[2px] bg-border/40 -z-10">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              className="h-full bg-primary transition-all duration-500"
            />
          </div>
          
          {STEPS.map((step, idx) => (
            <div key={step} className="flex flex-col items-center gap-3 bg-background px-4">
              <motion.div 
                animate={{ 
                  backgroundColor: idx <= currentStep ? "var(--primary)" : "var(--background)",
                  borderColor: idx <= currentStep ? "var(--primary)" : "var(--border)",
                  color: idx <= currentStep ? "#fff" : "var(--muted-foreground)",
                  scale: idx === currentStep ? 1.2 : 1
                }}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm",
                  idx === currentStep && "shadow-xl shadow-primary/20 ring-4 ring-primary/10"
                )}
              >
                {idx < currentStep ? <Check size={18} strokeWidth={3} /> : idx + 1}
              </motion.div>
              <span className={cn(
                "text-[10px] uppercase tracking-[0.2em] font-bold transition-colors duration-300",
                idx <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 xl:gap-24">
        {/* Left Column: Form Steps */}
        <div className="w-full lg:w-[60%] overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="address"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <MapPin size={20} />
                  </div>
                  <h2 className="text-2xl font-light tracking-tight">Thông tin giao hàng</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Họ và tên" placeholder="Nguyễn Văn A" />
                  <InputGroup label="Số điện thoại" placeholder="090 123 4567" />
                  <div className="md:col-span-2">
                    <InputGroup label="Email" placeholder="nguyenvana@aeris.vn" />
                  </div>
                  <div className="md:col-span-2">
                    <InputGroup label="Địa chỉ" placeholder="Số nhà, tên đường..." />
                  </div>
                  <InputGroup label="Thành phố" placeholder="Hồ Chí Minh" isSelect />
                  <InputGroup label="Phường/Xã" placeholder="Phường 1" />
                </div>

                <div className="pt-10 border-t border-border/40">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Truck size={20} />
                    </div>
                    <h2 className="text-2xl font-light tracking-tight">Phương thức vận chuyển</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ShippingOption 
                      active={true} 
                      title="Tiêu chuẩn" 
                      time="2-3 ngày làm việc" 
                      price="Miễn phí" 
                    />
                    <ShippingOption 
                      active={false} 
                      title="Giao hỏa tốc" 
                      time="Trong vòng 2 giờ" 
                      price="30.000đ" 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-10">
                  <Link href="/cart" className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    Quay lại giỏ hàng
                  </Link>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={nextStep}
                    className="h-16 px-12 bg-primary text-white rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-4 shadow-xl shadow-primary/20"
                  >
                    Tiếp theo
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-2xl font-light tracking-tight">Phương thức thanh toán</h2>
                </div>

                <div className="space-y-4">
                  <PaymentOption icon="💳" title="Thẻ tín dụng / Ghi nợ" active={true} />
                  <PaymentOption icon="📲" title="Ví điện tử (Momo, Zalopay)" active={false} />
                  <PaymentOption icon="🏦" title="Chuyển khoản ngân hàng" active={false} />
                  <PaymentOption icon="🚚" title="Thanh toán khi nhận hàng (COD)" active={false} />
                </div>

                <div className="bg-secondary/20 p-8 rounded-[2rem] border border-border/30">
                  <p className="text-sm font-bold mb-6 uppercase tracking-wider text-muted-foreground">Thông tin thẻ</p>
                  <div className="space-y-6">
                    <InputGroup label="Số thẻ" placeholder="0000 0000 0000 0000" />
                    <div className="grid grid-cols-2 gap-6">
                      <InputGroup label="Ngày hết hạn" placeholder="MM/YY" />
                      <InputGroup label="CVV" placeholder="***" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-10">
                  <button 
                    onClick={prevStep}
                    className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    Quay lại
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={nextStep}
                    disabled={isProcessing}
                    className="h-16 px-12 bg-emerald-600 text-white rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-4 shadow-xl shadow-emerald-600/20"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : "Xác nhận đặt hàng"}
                    {!isProcessing && <ArrowRight size={18} />}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 bg-emerald-50 rounded-[3rem] border border-emerald-100"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30"
                >
                  <Check size={48} strokeWidth={3} />
                </motion.div>
                <h2 className="text-4xl font-light mb-4 tracking-tight text-emerald-900">Đặt hàng thành công!</h2>
                <p className="text-emerald-700/70 mb-10 max-w-md mx-auto font-medium">Cảm ơn bạn đã tin tưởng Aeris. Chúng tôi đã gửi email xác nhận chi tiết đơn hàng đến bạn.</p>
                <Link href="/profile" className="inline-flex h-14 px-10 items-center justify-center bg-emerald-600 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20">
                  Xem đơn hàng của tôi
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[40%]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-28 bg-background/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-border/40 shadow-[0_20px_80px_rgba(0,0,0,0.05)]"
          >
            <h2 className="text-2xl font-light mb-10 tracking-tight">Đơn hàng</h2>
            
            <div className="space-y-8 mb-10">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center gap-6">
                  <div className="relative w-20 h-20 bg-secondary/30 rounded-2xl overflow-hidden border border-border/20 shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-cover mix-blend-multiply p-2" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold tracking-wide uppercase text-foreground/80">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Số lượng: 1</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                </div>
              ))}
            </div>
            
            <div className="border-t border-border/60 pt-8 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-light">Tạm tính</span>
                <span className="font-medium">19.980.000đ</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-light">Vận chuyển</span>
                <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">MIỄN PHÍ</span>
              </div>
              <div className="pt-6 border-t border-border/40 flex justify-between items-baseline">
                <span className="text-lg font-light">Tổng cộng</span>
                <span className="text-3xl font-light text-primary tracking-tighter">19.980.000đ</span>
              </div>
            </div>

            <div className="mt-10 p-6 bg-secondary/20 rounded-2xl border border-border/30 flex items-center gap-4">
              <ShieldCheck className="text-primary shrink-0" size={24} />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Thanh toán an toàn bảo mật 100% với mã hóa SSL</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, placeholder, isSelect = false }: { label: string, placeholder: string, isSelect?: boolean }) {
  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">{label}</label>
      {isSelect ? (
        <div className="relative">
          <select className="w-full h-14 px-5 rounded-2xl border border-border/60 bg-transparent focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none font-medium">
            <option value="">{placeholder}</option>
            <option value="hcm">Hồ Chí Minh</option>
            <option value="hn">Hà Nội</option>
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight size={16} className="rotate-90 text-muted-foreground" />
          </div>
        </div>
      ) : (
        <input 
          type="text" 
          placeholder={placeholder}
          className="w-full h-14 px-5 rounded-2xl border border-border/60 bg-transparent placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium"
        />
      )}
    </div>
  );
}

function ShippingOption({ active, title, time, price }: { active: boolean, title: string, time: string, price: string }) {
  return (
    <div className={cn(
      "p-6 rounded-2xl border-2 transition-all cursor-pointer",
      active ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-border/40 hover:border-border"
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold uppercase tracking-wider text-xs">{title}</span>
        <span className="font-bold text-sm text-primary">{price}</span>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{time}</p>
    </div>
  );
}

function PaymentOption({ icon, title, active }: { icon: string, title: string, active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer",
      active ? "border-primary bg-primary/5" : "border-border/40 hover:border-border"
    )}>
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex-1">{title}</span>
      {active && <Check size={18} className="text-primary" strokeWidth={3} />}
    </div>
  );
}
