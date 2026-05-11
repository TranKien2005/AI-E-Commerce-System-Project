import Link from "next/link";
import { Bot, PackageCheck, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { formatVnd, products } from "@/lib/demo-data";

export default function SellerDashboardPage() {
  return (
    <RoleShell title="Seller Center" eyebrow="Shop operations" links={sellerLinks}>
      <div className="grid gap-5 md:grid-cols-3">
        {[[TrendingUp, "Doanh thu", formatVnd(58200000)], [ShoppingBag, "Đơn hàng", "42"], [PackageCheck, "Sản phẩm", String(products.length)]].map(([Icon, label, value]) => <div key={String(label)} className="premium-panel p-7"><Icon className="mb-6 text-slate-950" /><p className="text-sm text-slate-500">{String(label)}</p><p className="mt-2 text-3xl font-light text-slate-950">{String(value)}</p></div>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="premium-panel p-8"><h2 className="text-3xl font-light text-slate-950">Đơn mới cần xử lý</h2><div className="mt-6 space-y-3">{[1001,1002,1003].map((id)=><Link key={id} href={`/seller/orders/${id}`} className="flex justify-between rounded-2xl bg-white/70 p-4 text-sm font-semibold text-slate-700"><span>Order #{id}</span><span>Chờ xử lý → Đang chuẩn bị</span></Link>)}</div></section>
        <section className="premium-panel p-8"><Bot className="mb-5" /><h2 className="text-2xl font-light text-slate-950">Chatbot shop</h2><p className="mt-3 text-sm leading-6 text-slate-500">Thiết lập khóa kết nối AI, hướng dẫn trả lời, mẫu phản hồi và trạng thái bật/tắt.</p><Link href="/seller/chatbot" className="premium-button mt-6 w-full">Cấu hình</Link></section>
      </div>
      <Link href="/seller/products/new" className="premium-button mt-6"><Plus size={18} /> Thêm sản phẩm</Link>
    </RoleShell>
  );
}
