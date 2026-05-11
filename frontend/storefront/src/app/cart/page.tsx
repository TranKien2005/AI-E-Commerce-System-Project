"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/api-types";
import { deleteCartItem, getCart, updateCartItem } from "@/lib/storefront-api";
import { getAccessToken } from "@/lib/auth-client";
import { formatVnd } from "@/lib/format";

const placeholderImage = "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=900&q=80";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [token] = useState(() => getAccessToken());
  const [loading, setLoading] = useState(() => Boolean(token));

  useEffect(() => {
    if (!token) return;
    getCart(token)
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải giỏ hàng."))
      .finally(() => setLoading(false));
  }, [token]);

  const loadCart = async () => {
    if (!token) return;
    const data = await getCart(token);
    setItems(data.items);
  };

  const changeQuantity = async (item: CartItem, quantity: number) => {
    if (!token || quantity < 1) return;
    await updateCartItem(token, item.item_id, quantity);
    await loadCart();
  };

  const removeItem = async (item: CartItem) => {
    if (!token) return;
    await deleteCartItem(token, item.item_id);
    await loadCart();
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!token) {
    return <LoginRequired title="Giỏ hàng" text="Đăng nhập để xem giỏ hàng thật của bạn." />;
  }

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Buyer cart</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Giỏ hàng</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {loading ? <div className="premium-panel p-10 text-slate-500">Đang tải giỏ hàng...</div> : (
        <div className="grid gap-10 lg:grid-cols-[1fr_25rem]">
          <div className="premium-panel divide-y divide-slate-200/70 p-4 md:p-6">
            {items.length === 0 ? <p className="p-8 text-slate-500">Giỏ hàng đang trống.</p> : items.map((item) => (
              <div key={item.item_id} className="grid gap-5 py-6 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr_auto]">
                <Link href={`/products/${item.product_id}`} className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-slate-100">
                  <Image src={item.primary_image ?? placeholderImage} alt={item.name} fill className="object-cover mix-blend-multiply" />
                </Link>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Backend cart item #{item.item_id}</p>
                  <Link href={`/products/${item.product_id}`} className="mt-2 block text-2xl font-light text-slate-950">{item.name}</Link>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Tồn kho hiện tại: {item.stock}</p>
                  <div className="mt-5 flex w-max items-center rounded-full bg-slate-100 p-1">
                    <button onClick={() => void changeQuantity(item, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Minus size={15} /></button>
                    <span className="w-12 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => void changeQuantity(item, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white"><Plus size={15} /></button>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-xl font-semibold text-slate-950">{formatVnd(item.price * item.quantity)}</p>
                  <button onClick={() => void removeItem(item)} className="rounded-full p-3 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>

          <aside className="premium-panel h-max p-8 lg:sticky lg:top-28">
            <h2 className="text-2xl font-light text-slate-950">Tổng thanh toán</h2>
            <div className="mt-8 space-y-5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tạm tính</span><span className="font-semibold">{formatVnd(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vận chuyển</span><span className="font-semibold text-emerald-600">Miễn phí</span></div>
              <div className="border-t border-slate-200 pt-5 flex justify-between text-lg"><span>Tổng cộng</span><span className="font-semibold">{formatVnd(subtotal)}</span></div>
            </div>
            <Link href="/checkout" className="premium-button mt-8 w-full">Checkout <ArrowRight size={18} /></Link>
            <div className="mt-6 grid gap-3">
              <p className="flex items-center gap-3 text-sm text-slate-500"><Truck size={17} /> Cập nhật shipping_status từ seller</p>
              <p className="flex items-center gap-3 text-sm text-slate-500"><ShieldCheck size={17} /> Thanh toán online được xử lý an toàn</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function LoginRequired({ title, text }: { title: string; text: string }) {
  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">{title}</p>
      <div className="premium-panel p-10 text-center">
        <h1 className="text-4xl font-light text-slate-950">Cần đăng nhập</h1>
        <p className="mt-4 text-slate-500">{text}</p>
        <Link href="/auth/login" className="premium-button mt-8">Đăng nhập</Link>
      </div>
    </div>
  );
}
