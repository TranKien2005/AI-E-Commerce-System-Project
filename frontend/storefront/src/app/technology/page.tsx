"use client";

import Image from "next/image";
import { Cpu, Wind, Zap, ShieldCheck } from "lucide-react";

export default function TechnologyPage() {
  const techs = [
    {
      icon: Wind,
      title: "AerisPure™ Flow",
      description: "Hệ thống lưu thông không khí 360 độ giúp làm sạch toàn bộ căn phòng chỉ trong 12 phút.",
    },
    {
      icon: Cpu,
      title: "AI Smart Sense",
      description: "Cảm biến laser siêu nhạy liên tục phân tích chất lượng không khí và tự động điều chỉnh công suất.",
    },
    {
      icon: Zap,
      title: "QuietPower™ Motor",
      description: "Động cơ không chổi than mạnh mẽ nhưng hoạt động cực kỳ yên tĩnh, chỉ 24dB ở chế độ ngủ.",
    },
    {
      icon: ShieldCheck,
      title: "HEPA-13 Nano",
      description: "Màng lọc HEPA cao cấp nhất loại bỏ 99.97% bụi mịn PM2.5, vi khuẩn và các tác nhân gây dị ứng.",
    },
  ];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20">
      <div className="max-w-3xl mb-20">
        <h1 className="text-4xl md:text-6xl font-light mb-8 tracking-tight">Công nghệ cốt lõi</h1>
        <p className="text-xl text-muted-foreground font-light leading-relaxed">
          Chúng tôi không chỉ chế tạo thiết bị. Chúng tôi định nghĩa lại cách con người tương tác với môi trường sống thông qua những đột phá về công nghệ và thiết kế.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-[#F5F5F7] border border-border/50">
          <Image 
            src="https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=1000&q=80" 
            alt="Inside Aeris" 
            fill
            className="object-cover mix-blend-multiply opacity-80"
          />
        </div>
        <div className="flex flex-col justify-center gap-10">
          {techs.map((tech, idx) => (
            <div key={idx} className="flex gap-6 group">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <tech.icon size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">{tech.title}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {tech.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1C1C1E] text-[#FFFFFF] rounded-[3rem] p-12 md:p-24 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#7986B0]/20 to-transparent"></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-light mb-8">Nghiên cứu vì tương lai</h2>
          <p className="text-lg text-gray-400 font-light mb-12 leading-relaxed">
            Hàng nghìn giờ thử nghiệm tại phòng Lab của Aeris để đảm bảo mỗi luồng gió bạn hít thở đều đạt độ tinh khiết tối đa.
          </p>
          <div className="inline-flex h-12 items-center px-8 rounded-full border border-gray-700 text-sm font-medium hover:bg-white hover:text-black transition-all cursor-pointer">
            Xem báo cáo kỹ thuật (PDF)
          </div>
        </div>
      </div>
    </div>
  );
}
