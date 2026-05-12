import Link from "next/link";
import { ChevronRight, FileText, HelpCircle, MessageCircle, PackageCheck, Search, Store, Truck } from "lucide-react";

export default function SupportPage() {
  const faqs = [
    "How do I track an order?",
    "How do refunds and returns work?",
    "How can I contact a shop?",
    "How do I report a product or seller?",
    "How do I apply to become a seller?",
  ];

  const contactMethods = [
    { icon: MessageCircle, title: "Shop chat", info: "Use the floating chat bubble to message sellers.", href: "/products" },
    { icon: PackageCheck, title: "Orders", info: "Review order, payment, and shipping status.", href: "/orders" },
    { icon: FileText, title: "Reports", info: "Submit product, shop, or seller reports.", href: "/reports/new" },
  ];

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mx-auto mb-12 max-w-4xl text-center">
        <p className="eyebrow mb-4">Support</p>
        <h1 className="text-5xl font-light text-slate-950 md:text-7xl">How can we help?</h1>
        <div className="relative mx-auto mt-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search orders, shipping, returns, seller help..." className="h-14 w-full rounded-2xl border border-white/70 bg-white/80 pl-12 pr-6 text-sm outline-none" />
        </div>
      </div>

      <div className="mb-12 grid gap-5 md:grid-cols-3">
        {contactMethods.map((method) => (
          <Link key={method.title} href={method.href} className="premium-panel p-8 transition hover:-translate-y-1">
            <method.icon className="mb-6 text-orange-500" size={28} />
            <h2 className="text-xl font-semibold text-slate-950">{method.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{method.info}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="premium-panel p-8">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-light text-slate-950"><HelpCircle size={24} /> Frequently asked questions</h2>
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <button key={faq} className="flex items-center justify-between rounded-2xl bg-slate-50 p-5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                {faq}
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        </section>
        <aside className="premium-panel h-max p-8">
          <Truck className="mb-5 text-orange-500" size={28} />
          <h2 className="text-2xl font-light text-slate-950">Marketplace help center</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">For seller onboarding, product reports, shipping issues, and order support, use the linked workflows in your account.</p>
          <Link href="/seller-request" className="premium-button mt-6 w-full"><Store size={17} /> Open a shop</Link>
        </aside>
      </div>
    </div>
  );
}
