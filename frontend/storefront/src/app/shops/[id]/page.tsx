import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, Search } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { formatVnd } from "@/lib/format";
import { safeImageUrl } from "@/lib/image";
import { getProducts, getShop } from "@/lib/storefront-api";
import type { ProductListItem } from "@/lib/api-types";

function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link href={`/products/${product.id}`} className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square bg-slate-100"><Image src={safeImageUrl(product.primary_image)} alt={product.name} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" /></div>
      <div className="p-4"><p className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-950">{product.name}</p><p className="mt-2 text-lg font-semibold text-slate-950">{formatVnd(product.price)}</p>{(product.sold_count ?? 0) > 0 && <p className="mt-1 text-xs font-semibold text-slate-400">{product.sold_count} sold</p>}</div>
    </Link>
  );
}

function ProductRow({ title, products }: { title: string; products: ProductListItem[] }) {
  if (!products.length) return null;
  return (
    <section className="mt-10">
      <div className="mb-5 flex items-center justify-between gap-4"><div><p className="eyebrow mb-3">Catalog</p><h2 className="text-3xl font-light text-slate-950">{title}</h2></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  );
}

export default async function ShopDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const queryParams = await searchParams;
  const query = String(queryParams.q ?? "");
  const page = String(queryParams.page ?? "1");
  const [shopResult, productsResult, newestResult, popularResult] = await Promise.allSettled([
    getShop(id),
    getProducts({ shop_id: id, q: query, page, page_size: "18" }),
    getProducts({ shop_id: id, sort: "newest", page_size: "6" }),
    getProducts({ shop_id: id, sort: "top_sales", page_size: "6" }),
  ]);

  if (shopResult.status === "rejected") {
    if (shopResult.reason instanceof ApiError && shopResult.reason.status === 404) notFound();
    throw shopResult.reason;
  }

  const shop = shopResult.value;
  const products = productsResult.status === "fulfilled" ? productsResult.value.products.items : [];
  const newest = newestResult.status === "fulfilled" ? newestResult.value.products.items : [];
  const popular = popularResult.status === "fulfilled" ? popularResult.value.products.items : [];

  return (
    <div className="premium-section py-12 pb-24">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-8 text-white shadow-xl md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Marketplace shop</p>
            <h1 className="mt-4 text-5xl font-light tracking-tight md:text-7xl">{shop.name}</h1>
            <p className="mt-5 max-w-3xl text-base font-light leading-8 text-white/70">{shop.description || "This shop has not added a public description yet."}</p>
          </div>
          <form action={`/shops/${shop.id}`} className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/15">
            <p className="mb-3 text-sm font-semibold">Tìm trong shop này</p>
            <div className="flex h-12 items-center gap-3 rounded-full bg-white px-4 text-slate-950"><Search size={17} className="text-slate-400" /><input name="q" defaultValue={query} placeholder="Tên sản phẩm..." className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-950" type="submit"><Package size={16} /> Search products</button>
          </form>
        </div>
      </section>

      {!query && <ProductRow title="Sản phẩm bán chạy" products={popular} />}
      {!query && <ProductRow title="Mới nhất trong shop" products={newest} />}
      <ProductRow title={query ? `Kết quả trong shop cho “${query}”` : "Tất cả sản phẩm của shop"} products={products} />
      {products.length === 0 && <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 p-8 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp trong shop này.</div>}
      <div className="mt-8"><Link href={`/products?shop_id=${shop.id}`} className="premium-button-light px-4 py-2"><Package size={16} /> View full catalog</Link></div>
    </div>
  );
}
