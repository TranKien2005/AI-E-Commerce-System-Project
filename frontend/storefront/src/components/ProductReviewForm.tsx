"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth-client";
import { createReview } from "@/lib/storefront-api";

export default function ProductReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setToken(getAccessToken());
      setHydrated(true);
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("Sign in to write a review.");
      return;
    }
    setLoading(true);
    try {
      await createReview(token, productId, Number(rating), comment, title);
      setTitle("");
      setComment("");
      setMessage("Review saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-[1.5rem] bg-slate-50 p-4">
      {!hydrated && <div className="rounded-2xl bg-white p-3 text-sm font-semibold text-slate-500">Loading review form...</div>}
      {hydrated && !token && <div className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">You need to <Link href="/auth/login" className="underline">sign in</Link> to submit a review.</div>}
      {message && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {error && <div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      {hydrated && token && <>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="soft-input" placeholder="Review title" />
        <select value={rating} onChange={(event) => setRating(event.target.value)} className="soft-input">
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Share your experience with this product" />
        <button disabled={loading} className="premium-button w-full disabled:opacity-60"><Star size={18} /> {loading ? "Saving..." : "Save review"}</button>
      </>}
    </form>
  );
}
