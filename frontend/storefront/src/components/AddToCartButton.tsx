"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAccessToken } from "@/lib/auth-client";
import { addCartItem } from "@/lib/storefront-api";

export default function AddToCartButton({ productId, className = "" }: { productId: number; className?: string }) {
  const router = useRouter();
  const { token, hydrated } = useAccessToken();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const addToCart = async () => {
    if (!hydrated) return;
    if (!token) {
      router.push("/auth/login");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await addCartItem(token, productId, 1);
      setMessage("Added");
      window.dispatchEvent(new Event("storefront-auth-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add to cart.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button onClick={() => void addToCart()} disabled={!hydrated || loading} className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
        <Plus size={15} /> {loading ? "Adding..." : message || "Add to cart"}
      </button>
      {error && <p className="mt-2 rounded-xl bg-rose-50 p-2 text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
