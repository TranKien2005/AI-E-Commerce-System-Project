"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useAccessToken } from "@/lib/auth-client";
import { addCartItem } from "@/lib/storefront-api";

export default function ProductPurchaseActions({ productId }: { productId: number }) {
  const router = useRouter();
  const { token, hydrated } = useAccessToken();
  const [loading, setLoading] = useState<"cart" | "buy" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requireToken = () => {
    if (!hydrated) return null;
    if (!token) {
      router.push("/auth/login");
      return null;
    }
    return token;
  };

  const addToCart = async () => {
    const accessToken = requireToken();
    if (!accessToken) return;
    setLoading("cart");
    setMessage("");
    setError("");
    try {
      await addCartItem(accessToken, productId, 1);
      setMessage("Added to cart.");
      window.dispatchEvent(new Event("storefront-auth-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add to cart.");
    } finally {
      setLoading(null);
    }
  };

  const buyNow = async () => {
    const accessToken = requireToken();
    if (!accessToken) return;
    setLoading("buy");
    setMessage("");
    setError("");
    try {
      await addCartItem(accessToken, productId, 1);
      window.dispatchEvent(new Event("storefront-auth-changed"));
      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setLoading(null);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={() => void addToCart()} disabled={!hydrated || loading !== null} className="premium-button h-14 flex-1 disabled:opacity-60"><ShoppingBag size={19} /> {loading === "cart" ? "Adding..." : "Add to cart"}</button>
        <button onClick={() => void buyNow()} disabled={!hydrated || loading !== null} className="premium-button-light h-14 flex-1 disabled:opacity-60">{loading === "buy" ? "Opening checkout..." : "Buy now"}</button>
      </div>
      {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
