import { Bot, CreditCard, Search, ShieldCheck, Store, Truck } from "lucide-react";

export default function TechnologyPage() {
  const features = [
    { icon: Search, title: "Intent-aware search", description: "Keyword and intent modes route shoppers into the same backend catalog without inventing fake product data." },
    { icon: Bot, title: "Shop chat foundation", description: "Conversation APIs connect buyers with shops and support future chatbot automation." },
    { icon: Store, title: "Seller operations", description: "Seller tools manage products, orders, shipping updates, and shop configuration." },
    { icon: CreditCard, title: "Secure checkout", description: "Orders, payments, carts, and notifications are handled through backend workflows." },
    { icon: Truck, title: "Order tracking", description: "Buyers can follow status changes from pending to delivered through real order data." },
    { icon: ShieldCheck, title: "Admin trust tools", description: "Admin workflows cover reports, seller requests, audit logs, and platform metrics." },
  ];

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mb-12 max-w-3xl">
        <p className="eyebrow mb-4">Platform technology</p>
        <h1 className="text-5xl font-light text-slate-950 md:text-7xl">Commerce infrastructure for a real marketplace</h1>
        <p className="mt-5 text-lg leading-8 text-slate-500">Aeris Market connects product discovery, buyer flows, seller tools, admin review, and shop messaging into one system.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="premium-panel p-8">
            <feature.icon className="mb-6 text-orange-500" size={30} />
            <h2 className="text-2xl font-light text-slate-950">{feature.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
