"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, Store, X } from "lucide-react";
import type { ChatMessage, ConversationSummary, CurrentUser } from "@/lib/api-types";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { openChatEventSocket } from "@/lib/chat-events";
import { getCurrentUser } from "@/lib/storefront-api";
import { getSellerChatConversations, getSellerChatMessages, markSellerConversationRead, sendSellerChatMessage } from "@/lib/seller-api";
import { cn } from "@/lib/utils";

export default function SellerChatWidget() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const unreadCount = items.reduce((sum, item) => sum + item.unread_count, 0);
  const canUseSellerChat = user?.role === "seller" || user?.role === "admin";

  const loadConversations = useCallback(async (accessToken: string, preferredId?: number) => {
    const data = await getSellerChatConversations(accessToken);
    setItems(data.items);
    setSelectedId((current) => {
      const nextId = preferredId ?? current;
      if (nextId && data.items.some((item) => item.id === nextId)) return nextId;
      return data.items[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    const syncAccount = () => {
      const accessToken = getAccessToken();
      setToken(accessToken);
      if (!accessToken) {
        setUser(null);
        setItems([]);
        return;
      }
      getCurrentUser(accessToken)
        .then((currentUser) => setUser(currentUser))
        .catch((err) => {
          if (clearTokensIfUnauthorized(err)) setToken(null);
        });
    };
    queueMicrotask(syncAccount);
    window.addEventListener("storefront-auth-changed", syncAccount);
    window.addEventListener("storage", syncAccount);
    return () => {
      window.removeEventListener("storefront-auth-changed", syncAccount);
      window.removeEventListener("storage", syncAccount);
    };
  }, []);

  useEffect(() => {
    if (!token || !canUseSellerChat) return;
    const refresh = () => {
      loadConversations(token).catch((err) => setError(err instanceof Error ? err.message : "Unable to load shop chat."));
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storefront-auth-changed", refresh);
    const socket = openChatEventSocket(token, (event) => {
      if (event.type === "chat_message" || event.type === "chat_conversation") {
        void loadConversations(token, event.conversation_id);
        if (event.conversation_id === selectedId) {
          void getSellerChatMessages(token, event.conversation_id).then((data) => setMessages(data.items));
        }
      }
    });
    return () => {
      socket.close();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storefront-auth-changed", refresh);
    };
  }, [canUseSellerChat, loadConversations, selectedId, token]);

  useEffect(() => {
    if (!token || !selectedId || !isOpen) {
      queueMicrotask(() => setMessages([]));
      return;
    }
    const refreshMessages = (showLoading = false) => {
      if (showLoading) setLoading(true);
      getSellerChatMessages(token, selectedId)
        .then((data) => setMessages(data.items))
        .then(() => markSellerConversationRead(token, selectedId))
        .then(() => loadConversations(token, selectedId))
        .catch((err) => setError(err instanceof Error ? err.message : "Unable to load messages."))
        .finally(() => {
          if (showLoading) setLoading(false);
        });
    };
    queueMicrotask(() => refreshMessages(true));
    return undefined;
  }, [isOpen, loadConversations, selectedId, token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = text.trim();
    if (!token || !selectedId || !content) return;
    setText("");
    setError("");
    try {
      await sendSellerChatMessage(token, selectedId, content);
      const data = await getSellerChatMessages(token, selectedId);
      setMessages(data.items);
      await loadConversations(token, selectedId);
      window.dispatchEvent(new Event("storefront-auth-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    }
  };

  if (!canUseSellerChat || !token) return null;

  return (
    <div className="fixed bottom-24 right-5 z-[60]">
      {isOpen && (
        <div className="mb-4 flex h-[34rem] w-[min(92vw,28rem)] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl md:w-[42rem]">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
            <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">My shop</p><h2 className="text-xl font-light text-slate-950">Customer chat</h2></div>
            <button onClick={() => setIsOpen(false)} className="premium-icon-button" aria-label="Close shop chat"><X size={18} /></button>
          </div>
          <div className="grid min-h-0 flex-1 md:grid-cols-[15rem_1fr]">
            <div className="min-h-0 border-b border-slate-200/70 md:border-b-0 md:border-r">
              <div className="flex max-h-48 gap-2 overflow-x-auto p-3 md:block md:max-h-full md:space-y-2 md:overflow-y-auto">
                {items.map((item) => (
                  <button key={item.id} onClick={() => setSelectedId(item.id)} className={cn("min-w-56 rounded-2xl p-3 text-left transition md:min-w-0 md:w-full", selectedId === item.id ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100")}>
                    <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><Store size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">Buyer #{item.buyer_id}</span><span className="block truncate text-xs opacity-70">{item.last_message || "No messages yet"}</span></span>{item.unread_count > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{item.unread_count}</span>}</div>
                  </button>
                ))}
                {items.length === 0 && <p className="p-4 text-sm leading-6 text-slate-500">No customer conversations yet.</p>}
              </div>
            </div>
            <div className="flex min-h-0 flex-col">
              <div className="border-b border-slate-200/70 px-5 py-4"><p className="font-semibold text-slate-950">{selected ? `Conversation #${selected.id}` : "Select a customer"}</p><p className="text-xs text-slate-500">Reply as your shop</p></div>
              {error && <div className="mx-4 mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {loading && <p className="text-center text-sm text-slate-500">Loading messages...</p>}
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", selected && message.sender_id === selected.seller_id ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6", selected && message.sender_id === selected.seller_id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600")}>{message.content}</div>
                  </div>
                ))}
                {selected && !loading && messages.length === 0 && <p className="text-center text-sm text-slate-500">No messages in this conversation yet.</p>}
              </div>
              <form onSubmit={submit} className="flex gap-2 border-t border-slate-200/70 p-4"><input value={text} onChange={(event) => setText(event.target.value)} disabled={!selectedId} className="soft-input" placeholder="Reply to customer..." /><button disabled={!selectedId || !text.trim()} className="premium-button px-4 disabled:opacity-50" aria-label="Send shop message"><Send size={17} /></button></form>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen((value) => !value)} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-[0_18px_50px_rgba(2,132,199,0.35)] transition hover:scale-105" aria-label="Open shop chat">
        <MessageCircle size={23} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}
      </button>
    </div>
  );
}
