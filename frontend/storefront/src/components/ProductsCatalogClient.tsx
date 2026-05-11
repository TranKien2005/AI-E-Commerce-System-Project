import Image from "next/image";
import Link from "next/link";
import { Filter, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import SearchModeBar from "@/components/SearchModeBar";
import type { Category, ProductListItem } from "@/lib/api-types";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

const placeholderImage = "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=900&q=80";

export default function ProductsCatalogClient({
  products,
  categories,
  mode,
  query,
  categoryId,
}: {
  products: ProductListItem[];
  categories: Category[];
  mode: string;
  query: string;
  categoryId: string;
}) {
  return (
    <>
      <div className="mb-10 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-end">
        <div>
          <p className="eyebrow mb-4">Product catalog</p>
          <h1 className="text-5xl font-light tracking-tight text-slate-950 md:text-7xl">Tìm sản phẩm</h1>
          <p className="mt-5 max-w-2xl text-slate-500">
            Chế độ hiện tại: <span className="font-semibold text-slate-950">{mode === "intent" ? "Tìm theo ý định" : "Tìm kiếm thường"}</span>. Kết quả được tải trực tiếp từ backend.
          </p>
        </div>
        <div className="premium-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
            {mode === "intent" ? <Sparkles size={17} /> : <Filter size={17} />}
            {mode === "intent" ? "Tìm theo mô tả nhu cầu" : "Tìm theo từ khóa"}
          </div>
          <p className="text-xs leading-5 text-slate-500">Intent search hiện gọi endpoint backend riêng và sẽ chính xác hơn khi backend có semantic search.</p>
        </div>
      </div>

      <SearchModeBar defaultQuery={query} className="mb-8" />

      <div className="mb-12 flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/60 p-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products?mode=${mode}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              !categoryId ? "bg-slate-950 text-white" : "bg-white/70 text-slate-500 hover:text-slate-950"
            )}
          >
            Tất cả
          </Link>
          {categories.map((item) => (
            <Link
              key={item.id}
              href={`/products?category_id=${item.id}&mode=${mode}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                categoryId === String(item.id) ? "bg-slate-950 text-white" : "bg-white/70 text-slate-500 hover:text-slate-950"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <button className="premium-button-light px-4 py-2">
          <SlidersHorizontal size={16} /> Bộ lọc nâng cao
        </button>
      </div>

      {products.length === 0 ? (
        <div className="premium-panel py-24 text-center">
          <p className="eyebrow mb-4">Không có kết quả</p>
          <h2 className="text-3xl font-light text-slate-950">Thử đổi từ khóa hoặc chọn danh mục khác.</h2>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="premium-card group flex h-full flex-col overflow-hidden p-3">
              <Link href={`/products/${product.id}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-slate-100">
                  <Image src={product.primary_image ?? placeholderImage} alt={product.name} fill className="object-cover mix-blend-multiply transition duration-700 group-hover:scale-105" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-700 backdrop-blur-xl">Còn {product.stock}</div>
                </div>
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link href={`/products/${product.id}`} className="block flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{product.shop_name ?? "Cửa hàng"}</p>
                  <h2 className="mt-2 line-clamp-2 min-h-14 text-xl font-light text-slate-950">{product.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">Thông tin chi tiết có trong trang sản phẩm.</p>
                </Link>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <span className="block font-semibold text-slate-950">{formatVnd(product.price)}</span>
                    <span className="text-xs text-slate-400">Chưa có đánh giá</span>
                  </div>
                  <Link href="/auth/login" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:scale-105" aria-label="Đăng nhập để thêm vào giỏ">
                    <Plus size={19} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
