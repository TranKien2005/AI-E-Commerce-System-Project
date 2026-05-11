import { Save, Store } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";

export default function SellerShopPage() {
  return <RoleShell title="Quản lý cửa hàng" eyebrow="Thông tin cửa hàng" links={sellerLinks}><form className="premium-panel grid gap-5 p-8"><Store className="text-slate-950" /><input className="soft-input" defaultValue="NovaTech Store" /><textarea className="min-h-36 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" defaultValue="Cửa hàng công nghệ cho học tập, làm việc và sáng tạo." /><button className="premium-button w-max"><Save size={18} /> Lưu cửa hàng</button></form></RoleShell>;
}
