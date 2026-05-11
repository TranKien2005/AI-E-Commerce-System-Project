import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, PackageCheck, Sparkles, Store, Truck } from "lucide-react";
import SearchModeBar from "@/components/SearchModeBar";
import { getCategories, getRecommendedProducts } from "@/lib/storefront-api";
import { formatVnd } from "@/lib/format";

const placeholderImage = "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=900&q=80";

export default async function Home() {
  const [productsResult, categoriesResult] = await Promise.allSettled([getRecommendedProducts(4), getCategories()]);
  const featured = productsResult.status === "fulfilled" ? productsResult.value.items : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value.items.filter((category) => category.parent_id === null).slice(0, 8) : [];
  const heroProduct = featured[0];

  return (
    <div className="overflow-hidden pb-24">
      <section className="premium-section relative min-h-[calc(100vh-5rem)] py-16 lg:py-24">
        <div className="absolute left-1/2 top-10 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow mb-6">AI-powered marketplace</p>
            <h1 className="max-w-4xl text-6xl font-light leading-[0.98] text-slate-950 md:text-8xl">
              Mua sắm đúng ý định, không chỉ đúng từ khóa.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-slate-500">
              Aeris Market là sàn thương mại điện tử tích hợp tìm kiếm theo ý định, gợi ý sản phẩm phù hợp nhu cầu và công cụ hỗ trợ người bán vận hành cửa hàng.
            </p>
            <div className="mt-9">
              <SearchModeBar />
              <p className="mt-4 text-sm text-slate-400">Chọn “Thường” cho keyword search hoặc “Intent AI” để mô tả nhu cầu tự nhiên.</p>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/products" className="premium-button">
                Khám phá sản phẩm <ArrowRight size={18} />
              </Link>
              <Link href="/seller-request" className="premium-button-light">
                Mở cửa hàng <Store size={18} />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="premium-panel p-4 md:p-6">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-slate-100">
                {heroProduct ? (
                  <>
                    <Image src={heroProduct.primary_image ?? placeholderImage} alt={heroProduct.name} fill priority className="object-cover mix-blend-multiply" />
                    <div className="absolute inset-x-5 bottom-5 rounded-[1.5rem] border border-white/70 bg-white/70 p-5 backdrop-blur-2xl">
                      <p className="eyebrow mb-2">Sản phẩm từ catalog thật</p>
                      <h2 className="text-2xl font-light text-slate-950">{heroProduct.name}</h2>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-lg font-semibold">{formatVnd(heroProduct.price)}</span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Còn {heroProduct.stock}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">Chưa tải được sản phẩm từ backend.</div>
                )}
              </div>
            </div>
            <div className="premium-card absolute -left-8 top-14 hidden w-52 p-5 lg:block">
              <Sparkles className="mb-4 text-slate-950" />
              <p className="text-sm font-semibold text-slate-950">Intent Search</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Mô tả nhu cầu để backend tìm sản phẩm phù hợp trong catalog.</p>
            </div>
            <div className="premium-card absolute -right-8 bottom-16 hidden w-52 p-5 lg:block">
              <Bot className="mb-4 text-slate-950" />
              <p className="text-sm font-semibold text-slate-950">Seller Chatbot</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Người bán tự cấu hình prompt, template và bật/tắt bot.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-section py-10">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            [Sparkles, "Intent search", "Tìm bằng mô tả tự nhiên"],
            [Truck, "Order & shipping", "Theo dõi đơn và trạng thái giao hàng"],
            [Bot, "Chatbot", "Chat với cửa hàng và trợ lý hỗ trợ"],
            [PackageCheck, "Catalog thật", "Sản phẩm, tồn kho và shop lấy từ backend"],
          ].map(([Icon, title, text]) => (
            <div key={String(title)} className="premium-card p-6">
              <Icon className="mb-5 text-slate-950" size={24} />
              <h3 className="text-lg font-semibold text-slate-950">{String(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{String(text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-section py-16">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Danh mục</p>
            <h2 className="text-4xl font-light text-slate-950 md:text-5xl">Khám phá theo taxonomy</h2>
          </div>
          <Link href="/products" className="hidden text-sm font-semibold text-slate-500 transition hover:text-slate-950 md:inline-flex">Xem tất cả</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category_id=${category.id}&mode=keyword`} className="min-w-48 rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-white">
              <span className="text-sm font-semibold text-slate-950">{category.name}</span>
              <p className="mt-3 text-xs leading-5 text-slate-500">Xem sản phẩm thuộc nhóm {category.name.toLowerCase()}.</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="premium-section py-16">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Sản phẩm nổi bật</p>
            <h2 className="text-4xl font-light text-slate-950 md:text-5xl">Dữ liệu từ backend</h2>
          </div>
          <Link href="/products" className="premium-button-light hidden md:inline-flex">Tới catalog <ArrowRight size={17} /></Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="group premium-card overflow-hidden p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100">
                <Image src={product.primary_image ?? placeholderImage} alt={product.name} fill className="object-cover mix-blend-multiply transition duration-700 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{product.shop_name ?? "Cửa hàng"}</p>
                <h3 className="mt-2 text-xl font-light text-slate-950">{product.name}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold">{formatVnd(product.price)}</span>
                  <span className="text-xs text-slate-400">Còn {product.stock}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="premium-section py-16">
        <div className="premium-panel grid gap-8 p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <p className="eyebrow mb-3">Dành cho người bán</p>
            <h2 className="text-4xl font-light text-slate-950">Đăng ký cửa hàng để đưa sản phẩm thật lên Aeris Market.</h2>
            <p className="mt-4 max-w-2xl text-slate-500">Gửi thông tin cửa hàng, danh mục kinh doanh và liên hệ để đội ngũ vận hành xét duyệt trước khi bắt đầu bán hàng.</p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row md:flex-col">
            <Link href="/seller-request" className="premium-button">Đăng ký mở cửa hàng</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
