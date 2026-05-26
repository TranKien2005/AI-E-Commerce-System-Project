"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { type ProductImage } from "@/lib/api-types";
import { placeholderProductImage, safeImageUrl } from "@/lib/image";

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  primaryImageId?: number | null;
}

export default function ProductImageGallery({
  images,
  productName,
  primaryImageId,
}: ProductImageGalleryProps) {
  const uniqueImages =
    images.length > 0
      ? images.filter((img) => img.url)
      : [
          {
            id: 0,
            url: placeholderProductImage,
            is_primary: true,
            variant: "MAIN",
          },
        ];

  const primaryImage = uniqueImages.find((img) => img.is_primary) ?? uniqueImages[0];
  const [selectedImageUrl, setSelectedImageUrl] = useState(primaryImage.url);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="premium-panel p-4 md:p-6 lg:sticky lg:top-28">
        <div
          className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-white to-slate-100 transition-transform hover:scale-[1.01]"
          onClick={() => setIsModalOpen(true)}
        >
          <Image
            src={safeImageUrl(selectedImageUrl)}
            alt={productName}
            fill
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-cover mix-blend-multiply"
          />
        </div>

        <div className="mt-5">
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {uniqueImages.map((image, index) => (
              <button
                key={`${image.id}-${index}`}
                onClick={() => setSelectedImageUrl(image.url)}
                className={`relative aspect-square w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                  selectedImageUrl === image.url
                    ? "border-slate-950 bg-white shadow-md"
                    : "border-slate-100 bg-slate-100 hover:border-slate-200"
                }`}
              >
                <Image
                  src={safeImageUrl(image.url)}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  sizes="96px"
                  className={`object-cover mix-blend-multiply transition-opacity ${
                    selectedImageUrl === image.url ? "opacity-100" : "opacity-70"
                  }`}
                />
                {image.is_primary && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 backdrop-blur-sm">
                    Main
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-6 right-6 z-[110] rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <div className="relative h-full w-full max-w-7xl animate-in zoom-in-95 duration-300">
            <Image
              src={safeImageUrl(selectedImageUrl)}
              alt={`${productName} full screen`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}