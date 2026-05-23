"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, Lock, MessageCircle, Package, Save, Settings, ShoppingBag, Store, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CurrentUser } from "@/lib/api-types";
import { changePassword, deleteAccount, getCurrentUser, updateCurrentUser } from "@/lib/storefront-api";
import { clearTokens, clearTokensIfUnauthorized, useAccessToken } from "@/lib/auth-client";

export default function ProfilePage() {
  const router = useRouter();
  const { token, hydrated } = useAccessToken();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getCurrentUser(token)
      .then((data) => {
        setUser(data);
        setFullName(data.full_name);
      })
      .catch((err) => {
        clearTokensIfUnauthorized(err);
        setError(err instanceof Error ? err.message : "Unable to load profile.");
      });
  }, [token]);

  const shopHref = user?.role === "seller" || user?.role === "admin" ? "/seller" : "/seller-request";
  const shopLabel = user?.role === "seller" || user?.role === "admin" ? "My Shop" : "Open a shop";
  const initials = (user?.full_name || user?.email || "A").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await updateCurrentUser(token, fullName);
      setUser((value) => value ? { ...value, full_name: fullName } : value);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || deleteConfirm !== "DELETE") return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteAccount(token, deletePassword);
      clearTokens();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete account.");
      setLoading(false);
    }
  };

  if (!hydrated) return <ProfileLoading />;
  if (!token) return <LoginRequired />;

  const cards = [
    [Package, "Orders", "Track pending, processing, shipping, and delivered orders.", "/orders"],
    [ShoppingBag, "Cart", "Review saved products and continue checkout.", "/cart"],
    [Bell, "Notifications", "Read order, seller request, and account updates.", "/notifications"],
    [MessageCircle, "Messages", "Continue conversations with shops and sellers.", "/chat"],
    [Store, shopLabel, user?.role === "seller" || user?.role === "admin" ? "Manage products, orders, shop settings, and analytics." : "Submit a request to become a seller.", shopHref],
  ] as const;

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Account center</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Profile</h1>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {message && <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <aside className="premium-panel h-max p-8 lg:sticky lg:top-28">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-950 text-2xl font-semibold text-white">{initials}</div>
          <h2 className="mt-6 text-2xl font-light text-slate-950">{user?.full_name ?? "Loading..."}</h2>
          <p className="mt-2 break-all text-sm text-slate-500">{user?.email ?? "—"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{user?.role ?? "—"}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">{user?.status ?? "—"}</span>
          </div>
          <div className="mt-8 grid gap-2">
            {["Overview", "Profile details", "Security", "Danger zone"].map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-white">{item}</a>)}
          </div>
        </aside>

        <section className="grid gap-6">
          <div id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map(([Icon, title, text, href]) => (
              <Link key={title} href={href} className="premium-panel p-6 transition hover:-translate-y-1">
                <Icon size={26} className="mb-5 text-slate-950" />
                <h2 className="text-2xl font-light text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
              </Link>
            ))}
          </div>

          <form id="profile-details" onSubmit={handleProfileSubmit} className="premium-panel grid gap-4 p-8">
            <div className="flex items-center gap-3"><Settings /><h2 className="text-2xl font-light text-slate-950">Profile details</h2></div>
            <label className="grid gap-2 text-sm font-semibold text-slate-600">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="soft-input" /></label>
            <label className="grid gap-2 text-sm font-semibold text-slate-600">Email<input className="soft-input" value={user?.email ?? ""} disabled /></label>
            <button disabled={loading} className="premium-button w-max disabled:opacity-60"><Save size={17} /> Save changes</button>
          </form>

          <form id="security" onSubmit={handlePasswordSubmit} className="premium-panel grid gap-4 p-8">
            <div className="flex items-center gap-3"><Lock /><h2 className="text-2xl font-light text-slate-950">Security</h2></div>
            <div className="grid gap-3 md:grid-cols-3">
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="soft-input" placeholder="Current password" />
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="soft-input" placeholder="New password" />
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="soft-input" placeholder="Confirm password" />
            </div>
            <button disabled={loading} className="premium-button-light w-max disabled:opacity-60"><Lock size={17} /> Change password</button>
          </form>

          <form id="danger-zone" onSubmit={handleDeleteSubmit} className="rounded-[2rem] border border-rose-200 bg-rose-50/70 p-8 shadow-sm">
            <div className="flex items-center gap-3 text-rose-700"><AlertTriangle /><h2 className="text-2xl font-light">Danger zone</h2></div>
            <p className="mt-3 text-sm leading-6 text-rose-700/80">Deleting your account signs you out and prevents future access with this account.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm outline-none" placeholder="Current password" />
              <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm outline-none" placeholder="Type DELETE to confirm" />
            </div>
            <button disabled={loading || deleteConfirm !== "DELETE"} className="mt-5 inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"><Trash2 size={17} /> Delete account</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="premium-panel p-10 text-slate-500">Loading your account...</div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="premium-panel p-10 text-center">
        <h1 className="text-4xl font-light text-slate-950">Sign in required</h1>
        <p className="mt-4 text-slate-500">Sign in to view your account profile.</p>
        <Link href="/auth/login" className="premium-button mt-8">Sign in</Link>
      </div>
    </div>
  );
}
