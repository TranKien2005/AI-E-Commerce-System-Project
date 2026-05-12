import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="premium-panel mx-auto max-w-3xl p-10 text-center">
        <MessageCircle className="mx-auto mb-5 text-slate-950" size={40} />
        <p className="eyebrow mb-4">Shop chat</p>
        <h1 className="text-4xl font-light text-slate-950">Use the chat bubble</h1>
        <p className="mt-4 text-slate-500">Conversations now open in the bottom-right chat bubble so you can keep browsing products and shops while messaging sellers.</p>
        <Link href="/products" className="premium-button mt-8">Browse products</Link>
      </div>
    </div>
  );
}
