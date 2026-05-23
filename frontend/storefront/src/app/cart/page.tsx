"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/api-types";
import { deleteCartItem, getCart, updateCartItem } from "@/lib/storefront-api";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { formatVnd } from "@/lib/format";
import { safeImageUrl } from "@/lib/image";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [token, setToken] = useState(() => getAccessToken());
  const [loading, setLoading] = useState(() => Boolean(token));
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    getCart(token)
      .then((data) => setItems(data.items))
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : "Unable to load cart.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const loadCart = async () => {
    if (!token) return;
    const data = await getCart(token);
    setItems(data.items);
  };

  const changeQuantity = async (item: CartItem, quantity: number) => {
    if (!token || quantity < 1) return;
    const previous = items;
    setPendingItemId(item.item_id);
    setError("");
    setItems((current) => current.map((cartItem) => cartItem.item_id === item.item_id ? { ...cartItem, quantity } : cartItem));
    try {
      await updateCartItem(token, item.item_id, quantity);
      window.dispatchEvent(new Event("storefront-auth-changed"));
      await loadCart();
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Unable to update cart.");
    } finally {
      setPendingItemId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (!token) return;
    const previous = items;
    setPendingItemId(item.item_id);
    setError("");
    setItems((current) => current.filter((cartItem) => cartItem.item_id !== item.item_id));
    try {
      await deleteCartItem(token, item.item_id);
      window.dispatchEvent(new Event("storefront-auth-changed"));
      await loadCart();
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Unable to remove item.");
    } finally {
      setPendingItemId(null);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!token) {
    return <LoginRequired title="Cart" text="Sign in to view your cart." />;
  }

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Buyer cart</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Cart</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {loading ? <div className="premium-panel p-10 text-slate-500">Loading your cart...</div> : (
        <div className="grid gap-10 lg:grid-cols-[1fr_25rem]">
          <div className="premium-panel divide-y divide-slate-200/70 p-4 md:p-6">
            {items.length === 0 ? <p className="p-8 text-slate-500">Your cart is empty.</p> : items.map((item) => (
              <div key={item.item_id} className={`grid gap-5 py-6 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr_auto] ${pendingItemId === item.item_id ? "opacity-60" : ""}`}>
                <Link href={`/products/${item.product_id}`} className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-slate-100">
                  <Image src={safeImageUrl(item.primary_image)} alt={item.name} fill sizes="9rem" className="object-cover mix-blend-multiply" />
                </Link>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Backend cart item #{item.item_id}</p>
                  <Link href={`/products/${item.product_id}`} className="mt-2 block text-2xl font-light text-slate-950">{item.name}</Link>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Current stock: {item.stock}</p>
                  <div className="mt-5 flex w-max items-center rounded-full bg-slate-100 p-1">
                    <button disabled={pendingItemId === item.item_id} onClick={() => void changeQuantity(item, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white disabled:opacity-50"><Minus size={15} /></button>
                    <span className="w-12 text-center text-sm font-semibold">{item.quantity}</span>
                    <button disabled={pendingItemId === item.item_id} onClick={() => void changeQuantity(item, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-50"><Plus size={15} /></button>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-xl font-semibold text-slate-950">{formatVnd(item.price * item.quantity)}</p>
                  <button disabled={pendingItemId === item.item_id} onClick={() => void removeItem(item)} className="rounded-full p-3 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>

          <aside className="premium-panel h-max p-8 lg:sticky lg:top-28">
            <h2 className="text-2xl font-light text-slate-950">Order summary</h2>
            <div className="mt-8 space-y-5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatVnd(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="font-semibold text-emerald-600">Free</span></div>
              <div className="border-t border-slate-200 pt-5 flex justify-between text-lg"><span>Total</span><span className="font-semibold">{formatVnd(subtotal)}</span></div>
            </div>
            <Link href="/checkout" className="premium-button mt-8 w-full">Checkout <ArrowRight size={18} /></Link>
            <div className="mt-6 grid gap-3">
              <p className="flex items-center gap-3 text-sm text-slate-500"><Truck size={17} /> Shipping status is updated by the seller</p>
              <p className="flex items-center gap-3 text-sm text-slate-500"><ShieldCheck size={17} /> Online payments are processed securely</p>
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
        <h1 className="text-4xl font-light text-slate-950">Sign in required</h1>
        <p className="mt-4 text-slate-500">{text}</p>
        <Link href="/auth/login" className="premium-button mt-8">Sign in</Link>
      </div>
    </div>
  );
}
