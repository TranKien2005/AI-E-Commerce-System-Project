import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, Sparkles, Star, Store } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import SearchModeBar from "@/components/SearchModeBar";
import type { Category, PageMeta, ProductListItem, ShopListItem } from "@/lib/api-types";
import { formatVnd } from "@/lib/format";
import { safeImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

const ratingOptions = [5, 4, 3];

const buildHref = (updates: Record<string, string | null | undefined>, current: Record<string, string>) => {
  const params = new URLSearchParams();
  Object.entries(current).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
};

function Pagination({ meta, param, current, className }: { meta: PageMeta; param: "page" | "shop_page"; current: Record<string, string>; className?: string }) {
  if (meta.total_pages <= 1) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {Array.from({ length: meta.total_pages }, (_, index) => index + 1).slice(0, 8).map((page) => (
        <Link key={page} href={buildHref({ [param]: String(page) }, current)} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", meta.page === page ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{page}</Link>
      ))}
    </div>
  );
}

export default function ProductsCatalogClient({
  products,
  productMeta,
  shops,
  shopMeta,
  categories,
  mode,
  query,
  categoryId,
  shopId,
  minPrice,
  maxPrice,
  minRating,
  sort,
  isFallback = false,
  aiParsed = null,
}: {
  products: ProductListItem[];
  productMeta: PageMeta;
  shops: ShopListItem[];
  shopMeta: PageMeta;
  categories: Category[];
  mode: string;
  query: string;
  categoryId: string;
  shopId: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sort: string;
  isFallback?: boolean;
  aiParsed?: any;
}) {
  const current = { mode, q: query, category_id: categoryId, shop_id: shopId, min_price: minPrice, max_price: maxPrice, min_rating: minRating, sort };
  const categoryCounts = new Map<number, { id: number; name: string; count: number }>();
  products.forEach((product) => {
    if (!product.category) return;
    const currentCategory = categoryCounts.get(product.category.id);
    categoryCounts.set(product.category.id, { id: product.category.id, name: product.category.name, count: (currentCategory?.count ?? 0) + 1 });
  });
  const resultCategories = Array.from(categoryCounts.values()).sort((a, b) => b.count - a.count).slice(0, 12);
  const fallbackCategories = resultCategories.length ? [] : categories.slice(0, 12).map((category) => ({ id: category.id, name: category.name, count: 0 }));
  const categoryChips = resultCategories.length ? resultCategories : fallbackCategories;
  const priceLabel = sort === "price_asc" ? "Price: low to high" : sort === "price_desc" ? "Price: high to low" : "Price";

  return (
    <>
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <p className="eyebrow mb-4">Product search</p>
          <h1 className="text-5xl font-light tracking-tight text-slate-950 md:text-7xl">Search marketplace</h1>
          <p className="mt-5 max-w-2xl text-slate-500">Tìm cùng lúc cửa hàng và sản phẩm, sau đó lọc nhanh theo danh mục, giá và đánh giá.</p>
        </div>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950"><SlidersHorizontal size={17} /> Marketplace search</div>
          <p className="text-xs leading-5 text-slate-500">Cửa hàng liên quan nhất hiện trước, sản phẩm có phân trang riêng để tải nhanh hơn.</p>
        </div>
      </div>

      <SearchModeBar defaultQuery={query} defaultMode={mode === "intent" ? "intent" : "keyword"} className="mb-6" />

      {mode === "intent" && isFallback && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm flex items-center gap-3">
          <Sparkles size={16} className="text-amber-500 animate-pulse shrink-0" />
          <span>
            <strong>AI Fallback Mode:</strong> Trình phân tích ý định AI hiện đang tạm bận. Hệ thống đã tự động chuyển sang phân tích ý định dự phòng bằng Regex và từ khóa truyền thống để phục vụ bạn.
          </span>
        </div>
      )}

      {mode === "intent" && aiParsed && (
        <div className="mb-6 rounded-[1.5rem] border border-violet-100 bg-violet-50/50 p-4 text-xs text-violet-800 backdrop-blur-xl">
          <div className="flex items-center gap-2 font-semibold text-violet-950 mb-2">
            <Sparkles size={14} className="text-violet-500" />
            AI Intent Analysis Results:
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {aiParsed.category && <span>Category: <strong className="text-slate-900">{aiParsed.category}</strong></span>}
            {(aiParsed.min_price || aiParsed.max_price) && (
              <span>
                Price range: <strong className="text-slate-900">
                  {aiParsed.min_price ? formatVnd(aiParsed.min_price) : "0đ"}
                  {aiParsed.max_price ? ` - ${formatVnd(aiParsed.max_price)}` : " trở lên"}
                </strong>
              </span>
            )}
            {aiParsed.sort && <span>Sorting: <strong className="text-slate-900">{aiParsed.sort}</strong></span>}
            {aiParsed.search_query && <span>Extracted Keywords: <strong className="text-slate-900">{aiParsed.search_query}</strong></span>}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur-xl lg:sticky lg:top-28">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Filters</p>
              <p className="text-xs text-slate-500">Refine current results</p>
            </div>
            <Link href={buildHref({ category_id: null, min_price: null, max_price: null, min_rating: null, page: null }, current)} className="text-xs font-semibold text-slate-500 hover:text-slate-950">Reset</Link>
          </div>

          <div className="border-t border-slate-100 py-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Category</p>
            <div className="grid gap-2">
              <Link href={buildHref({ category_id: null, page: null }, current)} className={cn("rounded-2xl px-3 py-2 text-sm font-semibold transition", !categoryId ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>All categories</Link>
              {categoryChips.map((item) => (
                <Link key={item.id} href={buildHref({ category_id: String(item.id), page: null }, current)} className={cn("rounded-2xl px-3 py-2 text-sm font-semibold transition", categoryId === String(item.id) ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>{item.name}{item.count ? ` (${item.count})` : ""}</Link>
              ))}
            </div>
          </div>

          <form action="/products" className="border-t border-slate-100 py-5">
            {query && <input type="hidden" name="q" value={query} />}
            {categoryId && <input type="hidden" name="category_id" value={categoryId} />}
            {shopId && <input type="hidden" name="shop_id" value={shopId} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            {minRating && <input type="hidden" name="min_rating" value={minRating} />}
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Price range</p>
            <div className="grid grid-cols-2 gap-2">
              <input name="min_price" defaultValue={minPrice} inputMode="numeric" placeholder="Min" className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none" />
              <input name="max_price" defaultValue={maxPrice} inputMode="numeric" placeholder="Max" className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none" />
            </div>
            <button className="premium-button-light mt-3 w-full px-4 py-3" type="submit">Apply price</button>
          </form>

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Rating</p>
            <div className="grid gap-2">
              {ratingOptions.map((rating) => (
                <Link key={rating} href={buildHref({ min_rating: String(rating), page: null }, current)} className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition", minRating === String(rating) ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>
                  <Star size={15} className="fill-amber-400 text-amber-400" /> {rating}{rating < 5 ? "+" : ""} stars
                </Link>
              ))}
              {minRating && <Link href={buildHref({ min_rating: null, page: null }, current)} className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">Clear rating</Link>}
            </div>
          </div>
        </aside>

        <main>
          {query && (
            <section className="mb-6 rounded-[2rem] border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950">Shop results</p><p className="text-xs text-slate-500">Một vài cửa hàng liên quan nhất hiện trước sản phẩm.</p></div><Store className="text-slate-400" /></div>
              {shops.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{shops.map((shop) => <Link key={shop.id} href={`/shops/${shop.id}`} className="rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"><p className="font-semibold text-slate-950">{shop.name}</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{shop.description || "Marketplace shop"}</p><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{shop.product_count ?? 0} products · {shop.sold_count ?? 0} sold</p></Link>)}</div> : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Không tìm thấy cửa hàng phù hợp.</p>}
              {shopMeta.total_pages > 1 && <Pagination className="mt-4" meta={shopMeta} param="shop_page" current={current} />}
            </section>
          )}
          <div className="mb-4 rounded-[1.5rem] border border-slate-200/70 bg-white/85 p-3 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sort by</span>
              <Link href={buildHref({ sort: null, page: null }, current)} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", !sort ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Relevant</Link>
              <Link href={buildHref({ sort: "newest", page: null }, current)} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", sort === "newest" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Latest</Link>
              <Link href={buildHref({ sort: "top_sales", page: null }, current)} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", sort === "top_sales" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Top Sales</Link>
              <details className="group relative">
                <summary className={cn("flex cursor-pointer list-none items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition", sort === "price_asc" || sort === "price_desc" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{priceLabel}<ChevronDown size={15} /></summary>
                <div className="absolute right-0 z-20 mt-2 grid w-48 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link href={buildHref({ sort: "price_asc", page: null }, current)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Low to high</Link>
                  <Link href={buildHref({ sort: "price_desc", page: null }, current)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">High to low</Link>
                </div>
              </details>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between text-sm text-slate-500"><span>{productMeta.total} products found</span>{query && <span className="inline-flex items-center gap-2"><Search size={15} /> {query}</span>}</div>

          {products.length === 0 ? (
            <div className="premium-panel py-24 text-center"><p className="eyebrow mb-4">No results</p><h2 className="text-3xl font-light text-slate-950">Try another keyword or category.</h2></div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                  <article key={product.id} className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <Link href={`/products/${product.id}`} className="block">
                      <div className="relative aspect-square overflow-hidden bg-slate-100"><Image src={safeImageUrl(product.primary_image)} alt={product.name} fill sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" /></div>
                    </Link>
                    <div className="p-3">
                      {product.category && <p className="mb-1 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{product.category.name}</p>}
                      <Link href={`/products/${product.id}`}><h2 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-950">{product.name}</h2></Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                        {product.avg_rating ? <span className="inline-flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" /> {product.avg_rating.toFixed(1)} ({product.review_count ?? 0})</span> : <span>No rating</span>}
                        {(product.sold_count ?? 0) > 0 && <span>{product.sold_count} sold</span>}
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-lg font-semibold text-slate-950">{formatVnd(product.price)}</p>{product.shop_name && <Link href={`/shops/${product.shop_id}`} className="mt-1 line-clamp-1 block text-xs text-slate-400 hover:text-slate-950">{product.shop_name}</Link>}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">{product.stock} left</span></div>
                      <AddToCartButton productId={product.id} className="mt-3" />
                    </div>
                  </article>
                ))}
              </div>
              {productMeta.total_pages > 1 && <Pagination className="mt-6" meta={productMeta} param="page" current={current} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
