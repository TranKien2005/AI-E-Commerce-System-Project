"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "máy lọc không khí";

  const results = [
    { id: 1, name: "Aeris A9", price: 12500000, image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80", category: "Essential" },
    { id: 2, name: "Aeris A7", price: 8900000, image: "https://images.unsplash.com/photo-1520691522060-22944b02d6ad?w=600&q=80", category: "Essential" },
    { id: 3, name: "Aeris Pro X", price: 24000000, image: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&q=80", category: "Pro" },
    { id: 4, name: "Aeris Nano", price: 4500000, image: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=600&q=80", category: "Mini" },
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-2 uppercase tracking-widest">Kết quả tìm kiếm cho</p>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight italic">"{query}"</h1>
        </div>
        <button className="flex items-center gap-2 px-6 h-12 rounded-full border border-border hover:bg-secondary transition-all text-sm font-medium">
          <SlidersHorizontal size={18} strokeWidth={1.5} />
          Bộ lọc nâng cao
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {results.map((product) => (
          <div key={product.id} className="group cursor-pointer">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-secondary mb-6 border border-transparent group-hover:border-primary/20 transition-all duration-500">
              <Image 
                src={product.image} 
                alt={product.name} 
                fill 
                className="object-cover group-hover:scale-110 transition-transform duration-700 mix-blend-multiply p-4"
              />
              <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-white">
                <Plus size={20} />
              </button>
            </div>
            <div className="px-2">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                <span className="text-xs text-muted-foreground font-light">{product.category}</span>
              </div>
              <p className="text-sm font-light text-muted-foreground">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price).replace('₫', 'đ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="py-32 text-center">
          <p className="text-lg text-muted-foreground font-light">Không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn.</p>
          <Link href="/products" className="inline-block mt-6 text-primary font-medium hover:underline">Khám phá tất cả sản phẩm</Link>
        </div>
      )}
    </div>
  );
}
