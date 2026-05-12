"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { getAccessToken } from "@/lib/auth-client";
import { createReport } from "@/lib/storefront-api";

export default function NewReportPage() {
  return (
    <Suspense fallback={<div className="premium-section py-12 pb-24"><div className="premium-panel p-10 text-slate-500">Loading report form...</div></div>}>
      <NewReportForm />
    </Suspense>
  );
}

function NewReportForm() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = getAccessToken();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("Sign in to submit a report.");
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await createReport(token, String(form.get("target_type") ?? "product"), Number(form.get("target_id")), String(form.get("reason") ?? ""));
      setMessage("Report submitted.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit report.");
    }
  };

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Report violation</p>
        <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Report a violation</h1>
        {!token && <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">You need to <Link href="/auth/login" className="underline">sign in</Link> to submit a report.</div>}
        {message && <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
        {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
        <form onSubmit={submit} className="premium-panel grid gap-5 p-8">
          <select name="target_type" className="soft-input" defaultValue={searchParams.get("target_type") ?? "product"}><option value="product">Product</option><option value="shop">Shop</option><option value="seller">Seller</option></select>
          <input name="target_id" className="soft-input" placeholder="Reported target ID" defaultValue={searchParams.get("target_id") ?? ""} required />
          <textarea name="reason" className="min-h-36 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Report reason" required />
          <button className="premium-button w-max"><Flag size={18} /> Submit report</button>
        </form>
      </div>
    </div>
  );
}
