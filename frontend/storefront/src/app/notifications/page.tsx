"use client";

import Link from "next/link";
import { Bell, CheckCheck, PackageCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { NotificationItem } from "@/lib/api-types";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/storefront-api";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | "all" | null>(null);

  const loadNotifications = async (accessToken: string) => {
    const data = await getNotifications(accessToken);
    setItems(data.items);
  };

  useEffect(() => {
    const accessToken = getAccessToken();
    queueMicrotask(() => {
      setToken(accessToken);
      if (!accessToken) return;
      loadNotifications(accessToken).catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : "Unable to load notifications.");
      }).finally(() => setLoading(false));
    });
  }, []);

  const markAll = async () => {
    if (!token) return;
    const previous = items;
    setPendingId("all");
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    try {
      await markAllNotificationsRead(token);
      await loadNotifications(token);
      window.dispatchEvent(new Event("storefront-auth-changed"));
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Unable to update notifications.");
    } finally {
      setPendingId(null);
    }
  };

  const markOne = async (id: number) => {
    if (!token) return;
    const previous = items;
    setPendingId(id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    try {
      await markNotificationRead(token, id, true);
      await loadNotifications(token);
      window.dispatchEvent(new Event("storefront-auth-changed"));
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Unable to update notification.");
    } finally {
      setPendingId(null);
    }
  };

  const removeOne = async (id: number) => {
    if (!token) return;
    const previous = items;
    setPendingId(id);
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await deleteNotification(token, id);
      window.dispatchEvent(new Event("storefront-auth-changed"));
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Unable to delete notification.");
    } finally {
      setPendingId(null);
    }
  };

  if (!token) {
    return (
      <div className="premium-section py-12 pb-24">
        <p className="eyebrow mb-4">Notifications</p>
        <div className="premium-panel p-10 text-center">
          <h1 className="text-4xl font-light text-slate-950">Sign in required</h1>
          <p className="mt-4 text-slate-500">Sign in to view your account notifications.</p>
          <Link href="/auth/login" className="premium-button mt-8">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div><p className="eyebrow mb-4">Notifications</p><h1 className="text-5xl font-light text-slate-950 md:text-7xl">Notifications</h1></div>
        <button onClick={() => void markAll()} disabled={pendingId !== null} className="premium-button-light disabled:opacity-60"><CheckCheck size={17} /> {pendingId === "all" ? "Updating..." : "Mark all as read"}</button>
      </div>
      {error && <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {loading && <div className="premium-panel p-8 text-slate-500">Đang tải thông báo...</div>}
      {!loading && <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="premium-panel flex gap-5 p-6 text-left transition hover:-translate-y-0.5">
            <button disabled={pendingId !== null} onClick={() => void markOne(item.id)} className="flex flex-1 gap-5 text-left disabled:opacity-60">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white"><PackageCheck size={21} /></div>
              <div>
                <h2 className="text-xl font-light text-slate-950">{item.title ?? item.type ?? `Notification #${item.id}`}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.content ?? item.message ?? "No content."}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">{item.is_read ? "Read" : "Unread"}</p>
              </div>
            </button>
            <button disabled={pendingId !== null} onClick={() => void removeOne(item.id)} className="h-11 w-11 rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" aria-label="Delete notification"><Trash2 className="mx-auto" size={18} /></button>
          </div>
        ))}
      </div>}
      {!loading && items.length === 0 && <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 p-8 text-center text-slate-500"><Bell className="mx-auto mb-3" /> No notifications yet.</div>}
    </div>
  );
}
