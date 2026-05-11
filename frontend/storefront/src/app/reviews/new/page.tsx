import { Star } from "lucide-react";

export default function NewReviewPage() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Product review</p>
        <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Đánh giá sản phẩm</h1>
        <form className="premium-panel grid gap-5 p-8">
          <input className="soft-input" placeholder="Product ID" />
          <select className="soft-input"><option>5 sao</option><option>4 sao</option><option>3 sao</option><option>2 sao</option><option>1 sao</option></select>
          <textarea className="min-h-36 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Nhận xét của bạn" />
          <button className="premium-button w-max"><Star size={18} /> Gửi đánh giá</button>
        </form>
      </div>
    </div>
  );
}
