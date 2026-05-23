import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Headphones, ShieldCheck, Store, Truck } from "lucide-react";
import SearchModeBar from "@/components/SearchModeBar";
import { getCategories, getProducts, getRecommendedProducts } from "@/lib/storefront-api";
import { formatVnd } from "@/lib/format";
import { safeImageUrl } from "@/lib/image";

type HomeProduct = {
  id: number;
  name: string;
  price: number;
  stock: number;
  primary_image: string | null;
  shop_name: string | null;
};

function ProductCard({ product }: { product: HomeProduct }) {
  return (
    <Link href={`/products/${product.id}`} className="group overflow-hidden rounded-[1.4rem] border border-slate-200/70 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square bg-slate-100">
        <Image src={safeImageUrl(product.primary_image)} alt={product.name} fill sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw" className="object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700">In stock</span>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-800">{product.name}</p>
        <p className="mt-2 truncate text-xs text-slate-400">{product.shop_name ?? "Official shop"}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-lg font-semibold text-slate-950">{formatVnd(product.price)}</span>
          <span className="text-xs text-slate-400">{product.stock} left</span>
        </div>
      </div>
    </Link>
  );
}

function ProductRail({ title, href, products }: { title: string; href: string; products: HomeProduct[] }) {
  if (!products.length) return null;

  return (
    <section className="premium-section py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-slate-700">See all <ArrowRight size={16} /></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {products.slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

export default async function Home() {
  const [recommendedResult, latestResult, bestPriceResult, gridResult, categoriesResult] = await Promise.allSettled([
    getRecommendedProducts(12),
    getProducts({ sort: "newest", page_size: "12" }),
    getProducts({ sort: "price_asc", page_size: "12" }),
    getProducts({ page_size: "24" }),
    getCategories(),
  ]);
  const recommended = recommendedResult.status === "fulfilled" ? recommendedResult.value.items : [];
  const latest = latestResult.status === "fulfilled" ? latestResult.value.products.items : [];
  const bestPrice = bestPriceResult.status === "fulfilled" ? bestPriceResult.value.products.items : [];
  const gridProducts = gridResult.status === "fulfilled" ? gridResult.value.products.items : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value.items.filter((category) => category.parent_id === null).slice(0, 10) : [];
  const heroProduct = recommended[0] ?? latest[0] ?? bestPrice[0];

  return (
    <div className="bg-slate-50 pb-24">
      <section className="premium-section py-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="rounded-[2rem] border border-white/80 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-xl md:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">Marketplace deals</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">Shop real products from trusted stores</h1>
            <p className="mt-4 max-w-2xl text-white/80">Search products, compare prices, chat with shops, and manage orders from one marketplace.</p>
            <div className="mt-7 max-w-3xl rounded-[1.5rem] bg-white/95 p-3 text-slate-950 shadow-2xl">
              <SearchModeBar />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm">Start shopping</Link>
              <Link href="/seller-request" className="rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25">Open a shop</Link>
            </div>
          </div>

          <Link href={heroProduct ? `/products/${heroProduct.id}` : "/products"} className="group overflow-hidden rounded-[2rem] bg-white p-4 shadow-xl">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100">
              {heroProduct ? <Image src={safeImageUrl(heroProduct.primary_image)} alt={heroProduct.name} fill priority sizes="(min-width: 1024px) 22rem, 100vw" className="object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">No product loaded</div>}
            </div>
            <div className="p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Featured item</p>
              <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-slate-950">{heroProduct?.name ?? "Browse the catalog"}</h2>
              {heroProduct && <p className="mt-2 text-lg font-bold text-slate-950">{formatVnd(heroProduct.price)}</p>}
            </div>
          </Link>
        </div>
      </section>

      <section className="premium-section py-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Truck, "Order Tracking", "Follow marketplace orders from checkout to delivery"],
            [ShieldCheck, "Buyer Protection", "Secure checkout and order tracking"],
            [BadgePercent, "Daily Deals", "Fresh offers from marketplace sellers"],
            [Headphones, "Shop Chat", "Message stores from the chat bubble"],
          ].map(([Icon, title, text]) => (
            <div key={String(title)} className="rounded-[1.5rem] bg-white p-5 shadow-sm">
              <Icon className="mb-3 text-sky-600" size={24} />
              <h3 className="font-semibold text-slate-950">{String(title)}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{String(text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-section py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Categories</h2>
          <Link href="/products" className="text-sm font-semibold text-slate-950">View catalog</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category_id=${category.id}`} className="rounded-[1.25rem] bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <Store className="mx-auto mb-3 text-sky-600" size={24} />
              <span className="line-clamp-2 text-sm font-semibold text-slate-800">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <ProductRail title="Recommended For You" href="/products" products={recommended} />
      <ProductRail title="Latest Products" href="/products?sort=newest" products={latest} />
      <ProductRail title="Best Price" href="/products?sort=price_asc" products={bestPrice} />

      <section className="premium-section py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">More to Love</h2>
          <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-slate-700">Explore all <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {gridProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </div>
  );
}
