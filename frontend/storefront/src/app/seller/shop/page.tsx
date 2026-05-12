"use client";

import { Save, Store } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import { getSellerShop, updateSellerShop } from "@/lib/seller-api";

export default function SellerShopPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getSellerShop(token)
      .then((shop) => {
        setName(shop.name);
        setDescription(shop.description);
        setStatus(shop.status);
      })
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.shop.missing);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateSellerShop(token, { name, description });
      setMessage(sellerCopy.common.success);
    } catch (err) {
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleShell title={sellerCopy.shop.title} eyebrow={sellerCopy.shop.eyebrow} links={sellerLinks}>
      {!token ? <div className="premium-panel p-8 text-slate-500">{sellerCopy.shell.signInText}</div> : loading ? <div className="premium-panel p-8 text-slate-500">{sellerCopy.common.loading}</div> : (
        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 p-8">
          <Store className="text-slate-950" />
          {message && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <input value={name} onChange={(event) => setName(event.target.value)} className="soft-input" placeholder={sellerCopy.shop.name} required />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-36 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder={sellerCopy.shop.description} />
          {status && <p className="text-sm text-slate-500">{sellerCopy.shop.status}: <b>{status}</b></p>}
          <button disabled={saving} className="premium-button w-max disabled:opacity-60"><Save size={18} /> {saving ? sellerCopy.common.saving : sellerCopy.common.save}</button>
        </form>
      )}
    </RoleShell>
  );
}
