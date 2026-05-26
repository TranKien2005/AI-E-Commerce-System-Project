import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, PlayCircle, Star, Store, ThumbsUp } from "lucide-react";
import ProductReviewForm from "@/components/ProductReviewForm";
import ProductSellerActions from "@/components/ProductSellerActions";
import ProductPurchaseActions from "@/components/ProductPurchaseActions";
import ProductImageGallery from "@/components/ProductImageGallery";
import { getProduct, getProductReviews } from "@/lib/storefront-api";
import { formatVnd } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { placeholderProductImage } from "@/lib/image";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [productResult, reviewsResult] = await Promise.allSettled([getProduct(id), getProductReviews(id)]);

  if (productResult.status === "rejected") {
    if (productResult.reason instanceof ApiError && productResult.reason.status === 404) notFound();
    throw productResult.reason;
  }

  const product = productResult.value;
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value.items : [];
  const uniqueImages = Array.from(new Map(product.images.filter((image) => image.url).map((image) => [`${image.id}-${image.url}`, image])).values());
  
  const details = product.attributes?.details ?? {};
  const normalizedDetails = product.attributes?.normalized_details ?? {};
  const detailRows = Object.entries({ ...normalizedDetails, ...details }).filter(([, value]) => value !== null && value !== "").slice(0, 16);
  const sourceInfo = [product.attributes?.source_domain?.replaceAll("_", " "), product.attributes?.source_category].filter(Boolean).join(" / ");

  return (
    <div className="premium-section py-8 md:py-12 pb-24">
      <div className="grid gap-8 grid-cols-1 md:grid-cols-[1.1fr,1fr] lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] md:items-start">
        
        <ProductImageGallery 
          images={uniqueImages} 
          productName={product.name} 
          primaryImageId={product.images.find(img => img.is_primary)?.id} 
        />

        <div className="flex flex-col mt-4 md:mt-0 px-1 sm:px-0">
          <p className="eyebrow mb-3 md:mb-4">Product detail</p>
          <h1 className="text-3xl font-light leading-tight text-slate-950 sm:text-4xl md:text-5xl xl:text-6xl">{product.name}</h1>
          <div className="mt-4 md:mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-1.5 shadow-inner"><Star size={16} className="fill-amber-400 text-amber-400" /> {product.avg_rating ? `${product.avg_rating.toFixed(1)} / ${product.review_count} reviews` : "No reviews yet"}</span>
            <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 font-semibold text-emerald-700 shadow-inner">{product.stock} items in stock</span>
          </div>
          <div className="mt-7 md:mt-8 rounded-[2rem] border border-white/70 bg-white/70 p-6 md:p-8 shadow-sm backdrop-blur-xl">
            <p className="text-4xl md:text-5xl font-light text-slate-950">{formatVnd(product.price)}</p>
            <p className="mt-5 text-base font-light leading-7 text-slate-600 whitespace-pre-wrap">{product.description || "This product does not have a detailed description yet."}</p>
            {sourceInfo && <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{sourceInfo}</p>}
            <div className="mt-1 md:mt-2">
              <ProductPurchaseActions productId={product.id} />
            </div>
          </div>

          {product.videos.length > 0 && (
            <div className="mt-8 premium-card p-5">
              <div className="flex items-center gap-3">
                <PlayCircle className="text-slate-950" size={22} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">Product videos</p>
                  <p className="text-xs text-slate-500">{product.videos.length} videos from the product data source.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {product.videos.slice(0, 2).map((video) => (
                  <a key={video.id} href={video.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                    {video.title || "Watch product video"}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 premium-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white flex-shrink-0"><Store size={20} /></div>
              <div className="flex-1">
                {product.shop ? <Link href={`/shops/${product.shop.id}`} className="text-sm font-semibold text-slate-950 hover:underline">{product.shop.name}</Link> : <p className="text-sm font-semibold text-slate-950">Marketplace shop</p>}
                {product.shop && <p className="mt-1 text-sm text-slate-500">Contact this store from the marketplace chat.</p>}
                <ProductSellerActions productId={product.id} shopId={product.shop?.id} sellerId={product.shop?.owner_id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-16 grid gap-6 grid-cols-1 lg:grid-cols-[1fr_24rem]">
        <div className="premium-panel p-6 sm:p-8">
          <p className="eyebrow mb-4">Description & attributes</p>
          <h2 className="text-3xl font-light text-slate-950">Product information</h2>
          <p className="mt-5 leading-8 text-slate-600 whitespace-pre-wrap">{product.description || "This product does not have a detailed description yet."}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {detailRows.length ? detailRows.map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-slate-50 p-5 text-sm">
                <p className="font-semibold capitalize text-slate-950">{key.replaceAll("_", " ")}</p>
                <p className="mt-1.5 break-words text-slate-600">{String(value)}</p>
              </div>
            )) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No specification table is available from the data source.</div>
            )}
          </div>
        </div>
        <div className="premium-panel p-6 sm:p-8">
          <p className="eyebrow mb-4">Review</p>
          <h2 className="text-3xl font-light text-slate-950">{product.avg_rating ? `${product.avg_rating.toFixed(1)}/5` : "No rating"}</h2>
          <div className="mt-5 space-y-4">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="rounded-2xl bg-slate-50 p-5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{review.rating}/5</p>
                  {review.verified_purchase && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-inner"><BadgeCheck size={12} /> Verified purchase</span>}
                  {review.helpful_votes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-inner"><ThumbsUp size={12} /> {review.helpful_votes}</span>}
                </div>
                {review.title && <p className="mt-2.5 font-semibold text-slate-800">{review.title}</p>}
                <p className="mt-1.5 text-slate-600 whitespace-pre-wrap">{review.comment || "No comment."}</p>
              </div>
            ))}
          </div>
          <ProductReviewForm productId={product.id} />
        </div>
      </section>
    </div>
  );
}