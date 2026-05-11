import { Save, Truck } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoleShell title={`Đơn hàng #${id}`} eyebrow="Cập nhật xử lý và vận chuyển" links={sellerLinks}><div className="grid gap-6 lg:grid-cols-2"><form className="premium-panel grid gap-5 p-8"><h2 className="text-2xl font-light text-slate-950">Cập nhật trạng thái đơn</h2><select className="soft-input"><option>pending</option><option>processing</option><option>shipping</option><option>delivered</option><option>cancelled</option></select><button className="premium-button w-max"><Save size={18} /> Lưu trạng thái</button></form><form className="premium-panel grid gap-5 p-8"><h2 className="text-2xl font-light text-slate-950">Cập nhật vận chuyển</h2><select className="soft-input"><option>preparing</option><option>shipping</option><option>delivered</option></select><textarea className="min-h-28 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Ghi chú vận chuyển" /><button className="premium-button w-max"><Truck size={18} /> Lưu vận chuyển</button></form></div></RoleShell>;
}
