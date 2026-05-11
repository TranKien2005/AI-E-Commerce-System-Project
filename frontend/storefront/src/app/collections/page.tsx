"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CollectionsPage() {
  const collections = [
    {
      id: 1,
      title: "Essential Series",
      description: "Sự cân bằng hoàn hảo giữa hiệu năng và thiết kế tối giản cho không gian sống hiện đại.",
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
      color: "bg-[#F5F5F7]",
    },
    {
      id: 2,
      title: "Pro Edition",
      description: "Công nghệ lọc tiên tiến nhất dành cho những không gian rộng và yêu cầu khắt khe.",
      image: "https://images.unsplash.com/photo-1520691522060-22944b02d6ad?w=800&q=80",
      color: "bg-[#E8E8EC]",
    },
    {
      id: 3,
      title: "Limited White",
      description: "Phiên bản giới hạn với chất liệu gốm cao cấp và sắc trắng tinh khiết nhất.",
      image: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&q=80",
      color: "bg-white",
    },
  ];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20">
      <div className="max-w-2xl mb-16">
        <h1 className="text-4xl md:text-5xl font-light mb-6 tracking-tight">Bộ sưu tập</h1>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">
          Khám phá những dòng sản phẩm được thiết kế tỉ mỉ, kết hợp giữa công nghệ tiên tiến và thẩm mỹ tối giản đặc trưng của Aeris.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {collections.map((collection) => (
          <div 
            key={collection.id}
            className={`group relative h-[400 md:h-[500px] rounded-3xl overflow-hidden border border-border/50 flex flex-col md:flex-row items-center ${collection.color}`}
          >
            <div className="flex-1 p-8 md:p-16 z-10">
              <h2 className="text-3xl font-light mb-4 group-hover:translate-x-2 transition-transform duration-500">
                {collection.title}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm font-light">
                {collection.description}
              </p>
              <Link 
                href="/products" 
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-4 transition-all"
              >
                Khám phá ngay
                <ArrowRight size={18} strokeWidth={1.5} />
              </Link>
            </div>
            
            <div className="flex-1 relative w-full h-full min-h-[300px] md:min-h-0 overflow-hidden">
              <Image 
                src={collection.image} 
                alt={collection.title}
                fill
                className="object-cover md:object-contain p-8 md:p-12 group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
