"use client";

import Link from "next/link";
import { Bot, Send, Store, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { getAccessToken } from "@/lib/auth-client";

type ChatMessage = {
  id: number;
  role: "buyer" | "shop";
  text: string;
};

export default function ChatPage() {
  const [token] = useState(() => getAccessToken());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "shop", text: "Xin chào, bạn có thể gửi câu hỏi về sản phẩm hoặc đơn hàng tại đây." },
  ]);
  const [text, setText] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setMessages((items) => [
      ...items,
      { id: Date.now(), role: "buyer", text: content },
      { id: Date.now() + 1, role: "shop", text: "Tin nhắn đã được ghi nhận. Khi nối conversation API đầy đủ, phản hồi sẽ đến từ seller hoặc chatbot của shop." },
    ]);
    setText("");
  };

  if (!token) {
    return (
      <div className="premium-section py-12 pb-24">
        <div className="premium-panel mx-auto max-w-3xl p-10 text-center">
          <h1 className="text-4xl font-light text-slate-950">Cần đăng nhập để chat</h1>
          <p className="mt-4 text-slate-500">Chat gắn với tài khoản buyer/seller, vì vậy bạn cần đăng nhập trước.</p>
          <Link href="/auth/login" className="premium-button mt-8">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-section py-12 pb-24">
      <p className="eyebrow mb-4">Buyer / Seller chat</p>
      <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Tin nhắn trực tiếp</h1>
      <section className="premium-panel mx-auto flex min-h-[38rem] max-w-4xl flex-col p-6">
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><Store size={20} /></div>
            <div>
              <p className="text-2xl font-light text-slate-950">Shop conversation</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Bot size={16} /> Chat bubble trực tiếp; conversation backend đầy đủ sẽ được nối ở bước tiếp theo.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto py-8">
          {messages.map((message) => (
            <div key={message.id} className={message.role === "buyer" ? "ml-auto flex max-w-xl justify-end gap-3" : "flex max-w-xl gap-3"}>
              {message.role === "shop" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Store size={16} /></div>}
              <div className={message.role === "buyer" ? "rounded-[1.5rem] bg-slate-950 p-4 text-sm leading-6 text-white" : "rounded-[1.5rem] bg-slate-100 p-4 text-sm leading-6 text-slate-600"}>{message.text}</div>
              {message.role === "buyer" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white"><User size={16} /></div>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-200 pt-5">
          <input value={text} onChange={(event) => setText(event.target.value)} className="soft-input" placeholder="Nhập tin nhắn..." />
          <button className="premium-button px-5"><Send size={17} /></button>
        </form>
      </section>
    </div>
  );
}
