import Link from "next/link";
import { ArrowRight, BadgePercent, Package, Sparkles } from "lucide-react";
import { getCategories } from "@/lib/storefront-api";

export default async function CollectionsPage() {
  const categoriesResult = await Promise.allSettled([getCategories()]);
  const categories = categoriesResult[0].status === "fulfilled" ? categoriesResult[0].value.items.filter((category) => category.parent_id === null).slice(0, 6) : [];

  const collections = [
    { icon: Sparkles, title: "Recommended Picks", description: "A rotating selection of marketplace products from active shops.", href: "/products" },
    { icon: BadgePercent, title: "Best Price", description: "Browse lower-priced products first using the catalog sort filter.", href: "/products?sort=price_asc" },
    { icon: Package, title: "New Arrivals", description: "Recently imported products from the backend catalog.", href: "/products?sort=newest" },
  ];

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mb-10 max-w-3xl">
        <p className="eyebrow mb-4">Collections</p>
        <h1 className="text-5xl font-light text-slate-950 md:text-7xl">Shop by marketplace collections</h1>
        <p className="mt-5 text-lg leading-8 text-slate-500">Use curated entry points and taxonomy categories to move through the catalog faster.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {collections.map((collection) => (
          <Link key={collection.title} href={collection.href} className="premium-panel p-8 transition hover:-translate-y-1">
            <collection.icon className="mb-6 text-orange-500" size={30} />
            <h2 className="text-2xl font-light text-slate-950">{collection.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{collection.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Explore <ArrowRight size={16} /></span>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-5 text-3xl font-light text-slate-950">Top categories</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category_id=${category.id}&mode=keyword`} className="rounded-[1.5rem] bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:text-slate-950">
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
