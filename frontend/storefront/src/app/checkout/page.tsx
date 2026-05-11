"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, MapPin, PackageCheck, Truck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CartItem } from "@/lib/api-types";
import { createOrder, getCart } from "@/lib/storefront-api";
import { getAccessToken } from "@/lib/auth-client";
import { formatVnd } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const [token] = useState(() => getAccessToken());
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddress] = useState("Hanoi, Vietnam");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getCart(token).then((data) => setItems(data.items)).catch((err) => setError(err instanceof Error ? err.message : "Không thể tải giỏ hàng."));
  }, [token]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const order = await createOrder(token, address);
      router.push(`/orders/${order.order_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <LoginRequired />;
  }

  return (
    <form onSubmit={handleSubmit} className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Checkout</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Tạo đơn hàng</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      <div className="grid gap-10 lg:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <section className="premium-panel p-8">
            <div className="mb-6 flex items-center gap-3"><MapPin /><h2 className="text-2xl font-light text-slate-950">Thông tin giao hàng</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="soft-input" placeholder="Tên người nhận" />
              <input className="soft-input" placeholder="Số điện thoại" />
              <input value={address} onChange={(event) => setAddress(event.target.value)} className="soft-input md:col-span-2" placeholder="Địa chỉ giao hàng" />
              <textarea className="min-h-28 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none md:col-span-2" placeholder="Ghi chú cho người bán" />
            </div>
          </section>

          <section className="premium-panel p-8">
            <div className="mb-6 flex items-center gap-3"><CreditCard /><h2 className="text-2xl font-light text-slate-950">Thanh toán</h2></div>
            <label className="block rounded-[1.5rem] border border-slate-900 bg-slate-950 p-5 text-white">
              <input name="payment" type="radio" defaultChecked className="mr-2" /> Tạo đơn trước, thanh toán sau trong chi tiết đơn
              <p className="mt-2 text-sm text-white/70">Backend sẽ tạo order từ giỏ hàng thật và xóa giỏ sau khi đặt hàng.</p>
            </label>
          </section>
        </div>

        <aside className="premium-panel h-max p-8 lg:sticky lg:top-28">
          <h2 className="text-2xl font-light text-slate-950">Tóm tắt đơn</h2>
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.item_id} className="flex gap-4">
                <div className="flex-1"><p className="font-medium text-slate-950">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.quantity} × {formatVnd(item.price)}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-between border-t border-slate-200 pt-6 text-lg"><span>Tổng</span><span className="font-semibold">{formatVnd(total)}</span></div>
          <button disabled={loading || items.length === 0} className="premium-button mt-8 w-full disabled:opacity-60"><PackageCheck size={18} /> {loading ? "Đang tạo đơn..." : "Xác nhận đặt hàng"}</button>
          <p className="mt-5 flex gap-3 text-sm leading-6 text-slate-500"><Truck size={18} className="mt-1 shrink-0" /> Sau khi xác nhận, đơn hàng sẽ được gửi đến cửa hàng và bạn sẽ nhận thông báo khi trạng thái thay đổi.</p>
        </aside>
      </div>
    </form>
  );
}

function LoginRequired() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="premium-panel p-10 text-center">
        <h1 className="text-4xl font-light text-slate-950">Cần đăng nhập</h1>
        <p className="mt-4 text-slate-500">Đăng nhập để tạo đơn hàng từ giỏ hàng thật.</p>
        <Link href="/auth/login" className="premium-button mt-8">Đăng nhập</Link>
      </div>
    </div>
  );
}
