"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LogIn, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { login, setTokens } from "@/lib/auth-client";
import { authCopy } from "@/lib/copy";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("buyer@example.com");
  const [password, setPassword] = useState("Buyer@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await login(email, password);
      setTokens(tokens);
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : authCopy.login.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-section flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/70 shadow-[0_32px_100px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-slate-950 p-10 text-white md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/40">Aeris Market</p>
          <h1 className="mt-6 text-5xl font-light leading-tight">{authCopy.login.heroTitle}</h1>
          <p className="mt-6 text-sm leading-7 text-white/60">{authCopy.login.heroText}</p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-5 p-8 md:p-12">
          <div><h2 className="text-3xl font-light text-slate-950">{authCopy.login.title}</h2><p className="mt-2 text-sm text-slate-500">{authCopy.login.subtitle}</p></div>
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} className="soft-input pl-12" type="email" placeholder="email@example.com" /></div>
          <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={password} onChange={(event) => setPassword(event.target.value)} className="soft-input pl-12" type="password" placeholder={authCopy.login.password} /></div>
          <button disabled={loading} className="premium-button disabled:opacity-60"><LogIn size={18} /> {loading ? authCopy.login.submitting : authCopy.login.submit}</button>
          <div className="flex justify-between text-sm"><Link href="/auth/register" className="font-semibold text-slate-950">{authCopy.login.createAccount}</Link><Link href="/support" className="text-slate-500">{authCopy.login.needHelp}</Link></div>
        </form>
      </div>
    </div>
  );
}
