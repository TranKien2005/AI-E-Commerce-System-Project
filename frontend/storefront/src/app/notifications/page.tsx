import { Bell, CheckCheck, PackageCheck, Store, TriangleAlert } from "lucide-react";

const notifications = [
  [PackageCheck, "Đơn #1001 đang được xử lý", "Seller đã xác nhận đơn hàng và chuẩn bị vận chuyển."],
  [Store, "Yêu cầu mở shop đang chờ duyệt", "Admin sẽ phản hồi kết quả qua thông báo hệ thống."],
  [TriangleAlert, "Báo cáo đã được tiếp nhận", "Báo cáo vi phạm của bạn đã chuyển đến admin."],
];

export default function NotificationsPage() {
  return (
    <div className="premium-section py-12 pb-24">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div><p className="eyebrow mb-4">Notifications</p><h1 className="text-5xl font-light text-slate-950 md:text-7xl">Thông báo</h1></div>
        <button className="premium-button-light"><CheckCheck size={17} /> Đánh dấu tất cả đã đọc</button>
      </div>
      <div className="grid gap-4">
        {notifications.map(([Icon, title, text]) => <div key={String(title)} className="premium-panel flex gap-5 p-6"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white"><Icon size={21} /></div><div><h2 className="text-xl font-light text-slate-950">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{String(text)}</p></div></div>)}
      </div>
      <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 p-8 text-center text-slate-500"><Bell className="mx-auto mb-3" /> Tất cả thông báo quan trọng về đơn hàng, cửa hàng và báo cáo sẽ được gom tại đây.</div>
    </div>
  );
}
