import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Flag, MessageCircle, ShieldCheck, ShoppingBag, Star, Store } from "lucide-react";
import { getProduct, getProductReviews } from "@/lib/storefront-api";
import { formatVnd } from "@/lib/format";
import { ApiError } from "@/lib/api-client";

const placeholderImage = "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=900&q=80";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [productResult, reviewsResult] = await Promise.allSettled([getProduct(id), getProductReviews(id)]);

  if (productResult.status === "rejected") {
    if (productResult.reason instanceof ApiError && productResult.reason.status === 404) notFound();
    throw productResult.reason;
  }

  const product = productResult.value;
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value.items : [];
  const images = product.images.length ? product.images : [{ id: 0, url: placeholderImage, is_primary: true }];
  const primaryImage = images.find((image) => image.is_primary) ?? images[0];
  const attributes = product.attributes ? Object.entries(product.attributes).filter(([, value]) => value !== null && value !== "" && !Array.isArray(value)) : [];

  return (
    <div className="premium-section py-12 pb-24">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="premium-panel p-4 md:p-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-white to-slate-100">
            <Image src={primaryImage.url} alt={product.name} fill priority className="object-cover mix-blend-multiply" />
            <div className="absolute left-5 top-5 rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">{product.category?.name ?? "Catalog"}</div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {images.slice(0, 4).map((image, index) => (
              <div key={`${image.id}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                <Image src={image.url} alt={`${product.name} ${index + 1}`} fill className="object-cover opacity-80 mix-blend-multiply" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <p className="eyebrow mb-4">Product detail</p>
          <h1 className="text-5xl font-light leading-tight text-slate-950 md:text-7xl">{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1"><Star size={15} className="fill-amber-400 text-amber-400" /> {product.avg_rating ? `${product.avg_rating.toFixed(1)} / ${product.review_count} đánh giá` : "Chưa có đánh giá"}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Còn {product.stock} sản phẩm</span>
          </div>
          <p className="mt-8 text-4xl font-light text-slate-950">{formatVnd(product.price)}</p>
          <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-slate-500">{product.description || "Sản phẩm chưa có mô tả chi tiết."}</p>

          <div className="mt-8 premium-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><Store size={20} /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-950">{product.shop?.name ?? "Cửa hàng"}</p>
                <p className="mt-1 text-sm text-slate-500">Shop đang hoạt động, hỗ trợ chat và chatbot tự động.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/chat" className="premium-button-light px-4 py-2"><Store size={16} /> Hỏi cửa hàng</Link>
                  <Link href="/chat" className="premium-button-light px-4 py-2"><MessageCircle size={16} /> Chat</Link>
                  <Link href="/reports/new" className="premium-button-light px-4 py-2"><Flag size={16} /> Báo cáo</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [ShieldCheck, "Bảo vệ giao dịch", "Thanh toán được xử lý an toàn"],
              [Bot, "Chatbot shop", "Phản hồi nhanh câu hỏi phổ biến"],
              [Store, "Shop đã xác thực", "Thông tin cửa hàng đã được xét duyệt"],
            ].map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-[1.5rem] border border-white/70 bg-white/60 p-5">
                <Icon size={20} className="mb-3 text-slate-950" />
                <p className="text-sm font-semibold text-slate-950">{String(title)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{String(text)}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/auth/login" className="premium-button h-14 flex-1"><ShoppingBag size={19} /> Đăng nhập để thêm vào giỏ</Link>
            <Link href="/auth/login" className="premium-button-light h-14 flex-1">Mua ngay</Link>
          </div>
        </div>
      </div>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="premium-panel p-8">
          <p className="eyebrow mb-4">Mô tả & thuộc tính</p>
          <h2 className="text-3xl font-light text-slate-950">Thông tin sản phẩm</h2>
          <p className="mt-5 leading-8 text-slate-500">{product.description || "Sản phẩm chưa có mô tả chi tiết."}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {attributes.slice(0, 8).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-950">{key}</p>
                <p className="mt-1 break-words text-slate-500">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="premium-panel p-8">
          <p className="eyebrow mb-4">Review</p>
          <h2 className="text-3xl font-light text-slate-950">{product.avg_rating ? `${product.avg_rating.toFixed(1)}/5` : "Chưa có"}</h2>
          <div className="mt-4 space-y-3">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-950">{review.rating}/5</p>
                <p className="mt-1 text-slate-500">{review.comment || "Không có nhận xét."}</p>
              </div>
            ))}
          </div>
          <Link href="/reviews/new" className="premium-button mt-6 w-full">Viết đánh giá</Link>
        </div>
      </section>
    </div>
  );
}
