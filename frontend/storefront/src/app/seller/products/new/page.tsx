import { Sparkles, UploadCloud } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";

export default function NewSellerProductPage() {
  return <RoleShell title="Thêm sản phẩm" eyebrow="Tạo sản phẩm mới" links={sellerLinks}><form className="premium-panel grid gap-5 p-8"><input className="soft-input" placeholder="Tên sản phẩm" /><textarea className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Mô tả" /><div className="grid gap-4 md:grid-cols-3"><input className="soft-input" placeholder="Giá" /><input className="soft-input" placeholder="Tồn kho" /><input className="soft-input" placeholder="Category ID" /></div><div className="rounded-[1.5rem] border border-dashed border-slate-300 p-5 text-sm text-slate-500"><Sparkles className="mb-3" /> Công cụ AI có thể hỗ trợ gợi ý tiêu đề, mô tả và từ khóa để sản phẩm hấp dẫn hơn.</div><button className="premium-button w-max"><UploadCloud size={18} /> Tạo sản phẩm</button></form></RoleShell>;
}
