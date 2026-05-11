"use client";

import { Search, MessageCircle, FileText, Phone, HelpCircle, ChevronRight } from "lucide-react";

export default function SupportPage() {
  const faqs = [
    "Làm thế nào để kết nối thiết bị với Wifi?",
    "Bao lâu thì tôi nên thay màng lọc HEPA?",
    "Chính sách bảo hành 1 đổi 1 trong 30 ngày là gì?",
    "Tôi có thể điều khiển máy qua ứng dụng di động không?",
    "Làm sao để biết chất lượng không khí trong phòng?",
  ];

  const contactMethods = [
    { icon: Phone, title: "Tổng đài", info: "1900 88xx (8:00 - 21:00)", color: "bg-blue-500/10 text-blue-600" },
    { icon: MessageCircle, title: "Chat trực tiếp", info: "Hỗ trợ 24/7 qua Messenger/Zalo", color: "bg-emerald-500/10 text-emerald-600" },
    { icon: FileText, title: "Gửi yêu cầu", info: "Chúng tôi sẽ phản hồi trong 24h", color: "bg-purple-500/10 text-purple-600" },
  ];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-5xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-light mb-6 tracking-tight">Chúng tôi có thể giúp gì?</h1>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} strokeWidth={1.5} />
          <input 
            type="text" 
            placeholder="Tìm kiếm hướng dẫn, mã lỗi, chính sách..."
            className="w-full h-14 pl-12 pr-6 rounded-2xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {contactMethods.map((method, idx) => (
          <div key={idx} className="bg-background border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${method.color}`}>
              <method.icon size={24} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-medium mb-2">{method.title}</h3>
            <p className="text-sm text-muted-foreground">{method.info}</p>
          </div>
        ))}
      </div>

      <div className="space-y-12">
        <div>
          <h2 className="text-2xl font-light mb-8 flex items-center gap-3">
            <HelpCircle size={24} className="text-primary" strokeWidth={1.5} />
            Câu hỏi thường gặp
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {faqs.map((faq, idx) => (
              <button 
                key={idx} 
                className="flex items-center justify-between p-6 bg-secondary/30 hover:bg-secondary/60 rounded-2xl transition-colors text-left group"
              >
                <span className="text-sm font-medium">{faq}</span>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 rounded-[2.5rem] p-10 md:p-16 border border-primary/10 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="max-w-md text-center md:text-left">
            <h3 className="text-2xl font-light mb-4">Chưa tìm thấy câu trả lời?</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              Đội ngũ chuyên gia của Aeris luôn sẵn sàng hỗ trợ bạn khắc phục mọi vấn đề kỹ thuật.
            </p>
          </div>
          <button className="h-14 px-10 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
            Kết nối với chuyên gia
          </button>
        </div>
      </div>
    </div>
  );
}
