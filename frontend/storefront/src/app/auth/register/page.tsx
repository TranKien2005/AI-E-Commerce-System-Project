"use client";

import Link from "next/link";
import { Mail, ShieldCheck, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { register, resendVerificationOtp, verifyOtp } from "@/lib/auth-client";
import { authCopy } from "@/lib/copy";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, fullName);
      setStep("verify");
      setMessage(authCopy.register.sent);
    } catch (err) {
      const message = err instanceof Error ? err.message : authCopy.register.error;
      if (message.includes("Email already exists")) {
        try {
          await resendVerificationOtp(email);
          setStep("verify");
          setMessage(authCopy.register.existingEmailNeedOtp);
        } catch (resendError) {
          setError(resendError instanceof Error ? resendError.message : message);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      setMessage(authCopy.verify.success);
    } catch (err) {
      setError(err instanceof Error ? err.message : authCopy.verify.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-section flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
      {step === "register" ? (
        <form onSubmit={handleRegister} className="premium-panel grid w-full max-w-2xl gap-5 p-8 md:p-12">
          <p className="eyebrow">{authCopy.register.eyebrow}</p>
          <h1 className="text-5xl font-light text-slate-950">{authCopy.register.title}</h1>
          <p className="text-sm leading-6 text-slate-500">{authCopy.register.subtitle}</p>
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={fullName} onChange={(event) => setFullName(event.target.value)} className="soft-input pl-12" placeholder={authCopy.register.fullName} /></div>
          <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} className="soft-input pl-12" type="email" placeholder="email@example.com" /></div>
          <input value={password} onChange={(event) => setPassword(event.target.value)} className="soft-input" type="password" placeholder={authCopy.register.password} />
          <button disabled={loading} className="premium-button disabled:opacity-60"><ShieldCheck size={18} /> {loading ? authCopy.register.submitting : authCopy.register.submit}</button>
          <p className="text-sm text-slate-500">{authCopy.register.already} <Link href="/auth/login" className="font-semibold text-slate-950">{authCopy.login.submit}</Link></p>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="premium-panel grid w-full max-w-2xl gap-5 p-8 md:p-12">
          <p className="eyebrow">{authCopy.verify.eyebrow}</p>
          <h1 className="text-5xl font-light text-slate-950">{authCopy.verify.title}</h1>
          {message && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <input value={otp} onChange={(event) => setOtp(event.target.value)} className="soft-input" placeholder={authCopy.verify.otp} />
          <button disabled={loading} className="premium-button disabled:opacity-60"><ShieldCheck size={18} /> {loading ? authCopy.verify.submitting : authCopy.verify.submit}</button>
          <button type="button" onClick={() => resendVerificationOtp(email).then(() => setMessage(authCopy.verify.resent))} className="premium-button-light w-max">{authCopy.verify.resend}</button>
          <Link href="/auth/login" className="text-sm font-semibold text-slate-950">{authCopy.verify.back}</Link>
        </form>
      )}
    </div>
  );
}
