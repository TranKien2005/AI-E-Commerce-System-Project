import Link from "next/link";
import { CreditCard, PackageCheck, Star, Truck, XCircle } from "lucide-react";
import { formatVnd, orders, products } from "@/lib/demo-data";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = orders.find((item) => item.id === Number(id)) ?? orders[0];

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Order #{id}</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Theo dõi đơn hàng</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="premium-panel p-8">
            <h2 className="text-2xl font-light text-slate-950">Timeline trạng thái</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {[
                ["pending", "Chờ xác nhận"],
                ["processing", "Đang chuẩn bị"],
                ["shipping", "Đang giao"],
                ["delivered", "Đã giao"],
              ].map(([step, label]) => <div key={step} className="rounded-[1.5rem] bg-white/70 p-5"><PackageCheck className="mb-4 text-slate-950" /><p className="font-semibold text-slate-950">{label}</p><p className="mt-1 text-xs text-slate-500">Cửa hàng sẽ cập nhật khi trạng thái thay đổi.</p></div>)}
            </div>
          </section>
          <section className="premium-panel p-8">
            <h2 className="text-2xl font-light text-slate-950">Sản phẩm trong đơn</h2>
            <div className="mt-6 divide-y divide-slate-200">
              {products.slice(0, 2).map((product) => <div key={product.id} className="flex justify-between py-4"><span>{product.name}</span><span className="font-semibold">{formatVnd(product.price)}</span></div>)}
            </div>
          </section>
        </div>
        <aside className="premium-panel h-max p-8">
          <h2 className="text-2xl font-light text-slate-950">Tổng quan</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-500">
            <p className="flex gap-3"><CreditCard size={18} /> Thanh toán: {order.payment}</p>
            <p className="flex gap-3"><Truck size={18} /> Vận chuyển: {order.shipping}</p>
            <p className="border-t border-slate-200 pt-4 text-lg text-slate-950">Tổng: <b>{formatVnd(order.total)}</b></p>
          </div>
          <button className="premium-button-light mt-6 w-full"><XCircle size={17} /> Hủy nếu còn pending</button>
          <Link href="/reviews/new" className="premium-button mt-3 w-full"><Star size={17} /> Đánh giá sản phẩm</Link>
        </aside>
      </div>
    </div>
  );
}
