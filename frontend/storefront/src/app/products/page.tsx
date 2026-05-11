import { Suspense } from "react";
import ProductsCatalogClient from "@/components/ProductsCatalogClient";
import { getCategories, getProducts, intentSearchProducts } from "@/lib/storefront-api";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const mode = String(params.mode ?? "keyword");
  const query = String(params.q ?? "");
  const categoryId = String(params.category_id ?? "");
  const page = String(params.page ?? "1");

  const [productsResult, categoriesResult] = await Promise.allSettled([
    mode === "intent" && query
      ? intentSearchProducts(query, page, "20")
      : getProducts({ q: query, category_id: categoryId, page, page_size: "20" }),
    getCategories(),
  ]);

  const products = productsResult.status === "fulfilled" ? productsResult.value.items : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value.items.filter((category) => category.parent_id === null).slice(0, 24) : [];

  return (
    <div className="premium-section py-12 pb-24">
      <Suspense fallback={<div className="premium-panel p-10 text-slate-500">Đang tải catalog...</div>}>
        <ProductsCatalogClient products={products} categories={categories} mode={mode} query={query} categoryId={categoryId} />
      </Suspense>
    </div>
  );
}
