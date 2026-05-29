"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Store, X } from "lucide-react";
import type { ChatMessage, ConversationSummary } from "@/lib/api-types";
import { openChatEventSocket } from "@/lib/chat-events";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { createChatConversation, getChatConversations, getChatMessages, markConversationRead, sendChatMessage, sendChatMessageStream } from "@/lib/storefront-api";
import { cn } from "@/lib/utils";

type OpenChatDetail = { conversationId?: number; sellerId?: number | null; shopId?: number | null };

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </span>
  );
}

export default function StorefrontChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [streamingBotId, setStreamingBotId] = useState<number | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const messageIdsRef = useRef<Set<number>>(new Set());
  const streamingConversationRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  const setLoadedMessages = useCallback((items: ChatMessage[], streamNewBot = false) => {
    const knownIds = messageIdsRef.current;
    const streamCandidate = streamNewBot ? [...items].reverse().find((message) => message.is_bot && !knownIds.has(message.id)) : undefined;
    messageIdsRef.current = new Set(items.map((message) => message.id));
    setMessages(items);
    if (streamCandidate) {
      setStreamingBotId(streamCandidate.id);
      setStreamingText("");
    }
  }, []);

  const loadConversations = async (accessToken: string, preferredId?: number) => {
    const data = await getChatConversations(accessToken);
    setConversations(data.items);
    setSelectedId((current) => {
      const nextId = preferredId ?? current;
      if (nextId && data.items.some((item) => item.id === nextId)) return nextId;
      return data.items[0]?.id ?? null;
    });
  };

  useEffect(() => {
    const openChat = (event: Event) => {
      const detail = (event as CustomEvent<OpenChatDetail>).detail ?? {};
      setIsOpen(true);
      const accessToken = getAccessToken();
      setToken(accessToken);
      if (!accessToken) return;
      if (detail.conversationId) {
        setSelectedId(detail.conversationId);
        void loadConversations(accessToken, detail.conversationId).catch((err) => setError(err instanceof Error ? err.message : "Unable to load conversations."));
        return;
      }
      if (detail.sellerId || detail.shopId) {
        createChatConversation(accessToken, detail.shopId ? { shop_id: detail.shopId } : { seller_id: detail.sellerId ?? undefined })
          .then((conversation) => {
            window.dispatchEvent(new Event("storefront-auth-changed"));
            return loadConversations(accessToken, conversation.id);
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Unable to open chat."));
      }
    };
    window.addEventListener("open-storefront-chat", openChat);
    return () => window.removeEventListener("open-storefront-chat", openChat);
  }, []);

  useEffect(() => {
    const accessToken = getAccessToken();
    queueMicrotask(() => {
      setToken(accessToken);
      if (!accessToken || !isOpen) return;
      loadConversations(accessToken).catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : "Unable to load conversations.");
      });
    });
    if (!accessToken) return;
    const socket = openChatEventSocket(accessToken, (event) => {
      if (event.type === "chat_message" || event.type === "chat_conversation") {
        void loadConversations(accessToken, event.conversation_id);
        if (event.conversation_id === selectedId) {
          if (streamingConversationRef.current === event.conversation_id) return;
          void getChatMessages(accessToken, event.conversation_id).then((data) => setLoadedMessages(data.items, true));
        }
      }
    });
    return () => socket.close();
  }, [isOpen, selectedId, setLoadedMessages]);

  useEffect(() => {
    if (!token || !selectedId) {
      queueMicrotask(() => {
        messageIdsRef.current = new Set();
        setMessages([]);
      });
      return;
    }
    getChatMessages(token, selectedId)
      .then((data) => setLoadedMessages(data.items))
      .then(() => markConversationRead(token, selectedId))
      .then(() => loadConversations(token))
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        messageIdsRef.current = new Set();
        setMessages([]);
        setSelectedId(null);
        setError(err instanceof Error ? err.message : "Unable to load messages.");
        void loadConversations(token);
      });
  }, [selectedId, setLoadedMessages, token]);

  useEffect(() => {
    queueMicrotask(() => {
      setStreamingBotId(null);
      setStreamingText("");
      setIsBotThinking(false);
    });
    streamingConversationRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    if (!streamingBotId || streamingBotId < 0) return;
    const message = messages.find((item) => item.id === streamingBotId);
    if (!message) return;
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      index = Math.min(message.content.length, index + Math.max(1, Math.ceil(message.content.length / 80)));
      setStreamingText(message.content.slice(0, index));
      if (index >= message.content.length) {
        setStreamingBotId(null);
        return;
      }
      timeoutId = setTimeout(tick, 18);
    };
    timeoutId = setTimeout(tick, 80);
    return () => clearTimeout(timeoutId);
  }, [messages, streamingBotId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [isBotThinking, messages, streamingText]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = text.trim();
    if (!token || !selectedId || !selected || !content) return;
    setText("");
    setError("");
    const conversationId = selectedId;
    const tempUserId = -Date.now();
    const tempBotId = tempUserId - 1;
    const optimisticMessage: ChatMessage = {
      id: tempUserId,
      conversation_id: conversationId,
      sender_id: 0,
      content,
      is_bot: false,
      is_read: true,
      created_at: null,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setIsBotThinking(true);
    streamingConversationRef.current = conversationId;

    let receivedStreamEvent = false;
    try {
      await sendChatMessageStream(token, conversationId, content, (streamEvent) => {
        receivedStreamEvent = true;
        if (streamEvent.type === "user_message") {
          messageIdsRef.current.add(streamEvent.message.id);
          setMessages((current) => current.map((message) => (message.id === tempUserId ? streamEvent.message : message)));
          return;
        }
        if (streamEvent.type === "bot_delta") {
          setIsBotThinking(false);
          setStreamingBotId(tempBotId);
          setMessages((current) => {
            if (current.some((message) => message.id === tempBotId)) return current;
            return [
              ...current,
              {
                id: tempBotId,
                conversation_id: conversationId,
                sender_id: selected.seller_id,
                content: "",
                is_bot: true,
                is_read: false,
                created_at: null,
              },
            ];
          });
          setStreamingText((current) => current + streamEvent.delta);
          return;
        }
        if (streamEvent.type === "bot_done") {
          messageIdsRef.current.add(streamEvent.message.id);
          setMessages((current) => {
            const withoutTemporaryBot = current.filter((message) => message.id !== tempBotId);
            if (withoutTemporaryBot.some((message) => message.id === streamEvent.message.id)) return withoutTemporaryBot;
            return [...withoutTemporaryBot, streamEvent.message];
          });
          setStreamingBotId(null);
          setStreamingText("");
          setIsBotThinking(false);
          streamingConversationRef.current = null;
          return;
        }
        if (streamEvent.type === "done") {
          setMessages((current) => current.filter((message) => message.id !== tempBotId));
          setStreamingBotId(null);
          setStreamingText("");
          setIsBotThinking(false);
          streamingConversationRef.current = null;
          return;
        }
        if (streamEvent.type === "error") {
          setError(streamEvent.message);
          setIsBotThinking(false);
          streamingConversationRef.current = null;
        }
      });
      window.dispatchEvent(new Event("storefront-auth-changed"));
      const data = await getChatMessages(token, conversationId);
      setLoadedMessages(data.items);
      await loadConversations(token, conversationId);
    } catch (err) {
      if (!receivedStreamEvent) {
        try {
          await sendChatMessage(token, conversationId, content);
          const data = await getChatMessages(token, conversationId);
          setLoadedMessages(data.items, true);
          await loadConversations(token, conversationId);
          return;
        } catch (fallbackErr) {
          if (clearTokensIfUnauthorized(fallbackErr)) setToken(null);
          setError(fallbackErr instanceof Error ? fallbackErr.message : "Unable to send message.");
        }
      } else {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : "Unable to send message.");
      }
      setMessages((current) => current.filter((message) => message.id !== tempUserId && message.id !== tempBotId));
    } finally {
      setIsBotThinking(false);
      streamingConversationRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {isOpen && (
        <div className="mb-4 flex h-[34rem] w-[min(92vw,28rem)] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl md:w-[42rem]">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">Messages</p>
              <h2 className="text-xl font-light text-slate-950">Shop chat</h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="premium-icon-button" aria-label="Close chat"><X size={18} /></button>
          </div>

          {!token ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="mb-4 text-slate-950" size={36} />
              <h3 className="text-2xl font-light text-slate-950">Sign in to chat</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Your conversations with shops are linked to your account.</p>
              <Link href="/auth/login" className="premium-button mt-6">Sign in</Link>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 md:grid-cols-[15rem_1fr]">
              <div className="min-h-0 border-b border-slate-200/70 md:border-b-0 md:border-r">
                <div className="flex max-h-48 gap-2 overflow-x-auto p-3 md:block md:max-h-full md:space-y-2 md:overflow-y-auto">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        "min-w-56 rounded-2xl p-3 text-left transition md:min-w-0 md:w-full",
                        selectedId === conversation.id ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><Store size={17} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{conversation.shop_name}</span>
                          <span className="block truncate text-xs opacity-70">{conversation.last_message || "No messages yet"}</span>
                        </span>
                        {conversation.unread_count > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count}</span>}
                      </div>
                    </button>
                  ))}
                  {conversations.length === 0 && <p className="p-4 text-sm leading-6 text-slate-500">No conversations yet. Start one from a product or shop page.</p>}
                </div>
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="border-b border-slate-200/70 px-5 py-4">
                  {selected?.shop_id ? <Link href={`/shops/${selected.shop_id}`} className="font-semibold text-slate-950 hover:underline">{selected.shop_name}</Link> : <p className="font-semibold text-slate-950">{selected?.shop_name ?? "Select a shop"}</p>}
                  <p className="text-xs text-slate-500">{selected?.seller_name ?? "Conversation"}</p>
                </div>
                {error && <div className="mx-4 mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                  {messages.map((message) => {
                    const isSellerMessage = Boolean(selected && message.sender_id === selected.seller_id);
                    const isStreaming = message.id === streamingBotId;
                    const content = isStreaming ? streamingText : message.content;
                    return (
                      <div key={message.id} className={cn("flex", isSellerMessage ? "justify-start" : "justify-end")}>
                        <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6", isSellerMessage ? "bg-slate-100 text-slate-600" : "bg-slate-950 text-white")}>
                          {content}
                          {isStreaming && <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-current" />}
                        </div>
                      </div>
                    );
                  })}
                  {selected && isBotThinking && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-600"><TypingDots /></div>
                    </div>
                  )}
                  {selected && messages.length === 0 && <p className="text-center text-sm text-slate-500">No messages in this conversation yet.</p>}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={submit} className="flex gap-2 border-t border-slate-200/70 p-4">
                  <input value={text} onChange={(event) => setText(event.target.value)} disabled={!selectedId} className="soft-input" placeholder="Type a message..." />
                  <button disabled={!selectedId || !text.trim()} className="premium-button px-4 disabled:opacity-50" aria-label="Send message"><Send size={17} /></button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={() => setIsOpen((value) => !value)} className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.35)] transition hover:scale-105" aria-label="Open chat">
        <MessageCircle size={23} />
      </button>
    </div>
  );
}
