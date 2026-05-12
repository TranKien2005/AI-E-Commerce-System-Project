"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useAccessToken } from "@/lib/auth-client";

export default function ProductSellerActions({ productId, shopId, sellerId }: { productId: number; shopId?: number | null; sellerId?: number | null }) {
  const router = useRouter();
  const { token, hydrated } = useAccessToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openConversation = async () => {
    if (!hydrated) return;
    if (!token) {
      router.push("/auth/login");
      return;
    }
    setError("");
    setLoading(true);
    window.dispatchEvent(new CustomEvent("open-storefront-chat", { detail: { sellerId, shopId } }));
    setLoading(false);
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void openConversation()} disabled={loading} className="premium-button-light px-4 py-2 disabled:opacity-60"><MessageCircle size={16} /> {loading ? "Opening..." : "Chat"}</button>
        <Link href={`/reports/new?target_type=product&target_id=${productId}`} className="premium-button-light px-4 py-2"><Flag size={16} /> Report</Link>
      </div>
      {error && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
