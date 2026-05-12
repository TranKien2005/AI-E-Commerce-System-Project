"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NewReviewPage() {
  return (
    <Suspense fallback={<div className="premium-section py-12 pb-24"><div className="premium-panel p-10 text-slate-500">Loading review guidance...</div></div>}>
      <ReviewGuidance />
    </Suspense>
  );
}

function ReviewGuidance() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id");
  const href = productId ? `/products/${productId}` : "/products";

  return (
    <div className="premium-section py-12 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Product review</p>
        <div className="premium-panel p-10 text-center">
          <Star className="mx-auto mb-6 text-slate-950" size={34} />
          <h1 className="text-4xl font-light text-slate-950">Write reviews from product detail pages</h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">Choose a product and use the review form on its detail page. You no longer need to enter a product ID manually.</p>
          <Link href={href} className="premium-button mt-8">{productId ? "Open product" : "Browse products"}</Link>
        </div>
      </div>
    </div>
  );
}
