import { Suspense } from "react";
import ProductsCatalogClient from "@/components/ProductsCatalogClient";
import { getCategories, getProducts } from "@/lib/storefront-api";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const mode = String(params.mode ?? "keyword");
  const query = String(params.q ?? params.keyword ?? "");
  const categoryId = String(params.category_id ?? "");
  const shopId = String(params.shop_id ?? "");
  const minPrice = String(params.min_price ?? "");
  const maxPrice = String(params.max_price ?? "");
  const minRating = String(params.min_rating ?? "");
  const sort = String(params.sort ?? "");
  const page = String(params.page ?? "1");
  const shopPage = String(params.shop_page ?? "1");
  const pageSize = String(params.page_size ?? "20");
  const productQuery = {
    q: query,
    category_id: categoryId,
    shop_id: shopId,
    min_price: minPrice,
    max_price: maxPrice,
    min_rating: minRating,
    sort,
    page,
    page_size: pageSize,
    shop_page: shopPage,
    shop_page_size: "4",
    search_type: mode === "intent" ? "ai" : "keyword"
  };

  const [searchResult, categoriesResult] = await Promise.allSettled([
    getProducts(productQuery),
    getCategories(),
  ]);

  const products = searchResult.status === "fulfilled" ? searchResult.value.products.items : [];
  const productMeta = searchResult.status === "fulfilled" ? searchResult.value.products.meta : { page: 1, page_size: 20, total: 0, total_pages: 0 };
  const shops = searchResult.status === "fulfilled" ? searchResult.value.shops.items : [];
  const shopMeta = searchResult.status === "fulfilled" ? searchResult.value.shops.meta : { page: 1, page_size: 4, total: 0, total_pages: 0 };
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value.items.filter((category) => category.parent_id === null).slice(0, 24) : [];
  const isFallback = searchResult.status === "fulfilled" ? (searchResult.value.is_fallback ?? false) : false;
  const aiParsed = searchResult.status === "fulfilled" ? (searchResult.value.ai_parsed ?? null) : null;

  return (
    <div className="premium-section py-12 pb-24">
      <Suspense fallback={<div className="premium-panel p-10 text-slate-500">Loading catalog...</div>}>
        <ProductsCatalogClient
          products={products}
          productMeta={productMeta}
          shops={shops}
          shopMeta={shopMeta}
          categories={categories}
          mode={mode}
          query={query}
          categoryId={categoryId}
          shopId={shopId}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minRating={minRating}
          sort={sort}
          isFallback={isFallback}
          aiParsed={aiParsed}
        />
      </Suspense>
    </div>
  );
}
