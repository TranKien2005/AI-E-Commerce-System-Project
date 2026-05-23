"use client";

import { Bot, KeyRound, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import { getSellerChatbotConfig, updateSellerChatbotConfig } from "@/lib/seller-api";

export default function SellerChatbotPage() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const accessToken = getAccessToken();
      setToken(accessToken);
      setHydrated(true);
      setLoading(Boolean(accessToken));
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    getSellerChatbotConfig(token)
      .then((config) => {
        setIsEnabled(config.is_enabled);
        setApiKey(config.api_key ?? "");
        setPrompt(config.prompt);
        setTemplate(config.template);
      })
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateSellerChatbotConfig(token, { api_key: apiKey, prompt, template, is_enabled: isEnabled });
      setMessage(sellerCopy.common.success);
    } catch (err) {
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleShell title={sellerCopy.chatbot.title} eyebrow={sellerCopy.chatbot.eyebrow} links={sellerLinks}>
      {!hydrated ? <div className="premium-panel p-8 text-slate-500">Đang kiểm tra tài khoản...</div> : !token ? <div className="premium-panel p-8 text-slate-500">{sellerCopy.shell.signInText}</div> : loading ? <div className="premium-panel p-8 text-slate-500">{sellerCopy.common.loading}</div> : (
        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 p-8">
          <Bot size={34} />
          {message && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} /> {sellerCopy.chatbot.enabled}</label>
          <div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="soft-input pl-12" placeholder={sellerCopy.chatbot.apiKey} /></div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder={sellerCopy.chatbot.prompt} />
          <textarea value={template} onChange={(event) => setTemplate(event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder={sellerCopy.chatbot.template} />
          <p className="text-sm text-slate-500">{sellerCopy.chatbot.securityNote}</p>
          <button disabled={saving} className="premium-button w-max disabled:opacity-60"><Save size={18} /> {saving ? sellerCopy.common.saving : sellerCopy.common.save}</button>
        </form>
      )}
    </RoleShell>
  );
}
