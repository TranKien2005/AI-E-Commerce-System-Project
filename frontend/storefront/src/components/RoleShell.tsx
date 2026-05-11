import Link from "next/link";
import { ReactNode } from "react";

export function RoleShell({ title, eyebrow, links, children }: { title: string; eyebrow: string; links: { href: string; label: string }[]; children: ReactNode }) {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="mb-10">
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h1 className="text-5xl font-light text-slate-950 md:text-7xl">{title}</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside className="premium-panel h-max p-3 lg:sticky lg:top-28">
          {links.map((link) => <Link key={link.href} href={link.href} className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950">{link.label}</Link>)}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

export const sellerLinks = [
  { href: "/seller", label: "Overview" },
  { href: "/seller/shop", label: "Cửa hàng" },
  { href: "/seller/products", label: "Sản phẩm" },
  { href: "/seller/orders", label: "Đơn hàng" },
  { href: "/chat", label: "Chat khách" },
  { href: "/seller/chatbot", label: "Chatbot" },
  { href: "/seller/stats", label: "Thống kê" },
];

