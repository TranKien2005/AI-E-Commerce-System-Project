import { Bot, KeyRound, Save } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";

export default function SellerChatbotPage() {
  return <RoleShell title="Cấu hình chatbot" eyebrow="Trợ lý tự động của shop" links={sellerLinks}><form className="premium-panel grid gap-5 p-8"><Bot size={34} /><label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" defaultChecked /> Bật chatbot cho shop</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="soft-input pl-12" placeholder="Khóa kết nối dịch vụ AI" /></div><textarea className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Prompt ban đầu cho chatbot" /><textarea className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Template câu trả lời" /><button className="premium-button w-max"><Save size={18} /> Lưu cấu hình</button></form></RoleShell>;
}
