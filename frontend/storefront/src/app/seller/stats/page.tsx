import { BarChart3, TrendingUp } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { formatVnd } from "@/lib/demo-data";

export default function SellerStatsPage() {
  return <RoleShell title="Thống kê bán hàng" eyebrow="Hiệu quả kinh doanh" links={sellerLinks}><div className="grid gap-5 md:grid-cols-3">{[["Doanh thu", formatVnd(58200000)], ["Đơn hoàn thành", "31"], ["Tỉ lệ thanh toán", "86%"]].map(([label,value])=><div key={label} className="premium-panel p-7"><TrendingUp className="mb-5" /><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-light text-slate-950">{value}</p></div>)}</div><div className="premium-panel mt-6 p-8"><BarChart3 className="mb-5" /><h2 className="text-3xl font-light text-slate-950">Xu hướng doanh thu</h2><div className="mt-8 flex h-64 items-end gap-4">{[40,70,52,90,66,78,58].map((height,idx)=><div key={idx} className="flex-1 rounded-t-3xl bg-slate-950/80" style={{height:`${height}%`}} />)}</div></div></RoleShell>;
}
