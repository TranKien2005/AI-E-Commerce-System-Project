import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { formatVnd, orders } from "@/lib/demo-data";

export default function SellerOrdersPage() {
  return <RoleShell title="Quản lý đơn hàng" eyebrow="Xử lý đơn của shop" links={sellerLinks}><div className="grid gap-4">{orders.map((order)=><div key={order.id} className="premium-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"><div><p className="eyebrow">Order #{order.id}</p><h2 className="mt-2 text-2xl font-light text-slate-950">{formatVnd(order.total)}</h2><p className="mt-1 text-sm text-slate-500">Trạng thái: {order.status} · Vận chuyển: {order.shipping}</p></div><div className="flex gap-2"><button className="premium-button-light"><Truck size={16} /> Cập nhật vận chuyển</button><Link href={`/seller/orders/${order.id}`} className="premium-button">Chi tiết <ArrowRight size={16} /></Link></div></div>)}</div></RoleShell>;
}
