import { Flag } from "lucide-react";

export default function NewReportPage() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Report violation</p>
        <h1 className="mb-10 text-5xl font-light text-slate-950 md:text-7xl">Báo cáo vi phạm</h1>
        <form className="premium-panel grid gap-5 p-8">
          <select className="soft-input"><option value="product">Sản phẩm</option><option value="shop">Cửa hàng</option><option value="seller">Người bán</option></select>
          <input className="soft-input" placeholder="ID đối tượng bị báo cáo" />
          <textarea className="min-h-36 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Lý do báo cáo" />
          <button className="premium-button w-max"><Flag size={18} /> Gửi báo cáo</button>
        </form>
      </div>
    </div>
  );
}
