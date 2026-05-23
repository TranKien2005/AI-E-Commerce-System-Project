import { MessageCircle } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { sellerCopy } from "@/lib/copy";

export default function SellerChatPage() {
  return (
    <RoleShell title="Chat khách hàng" eyebrow={sellerCopy.shell.links.customerChat} links={sellerLinks}>
      <div className="premium-panel p-10 text-center">
        <MessageCircle className="mx-auto mb-5 text-sky-600" size={42} />
        <h2 className="text-3xl font-light text-slate-950">Dùng bong bóng chat của shop</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500">
          Inbox của shop đã được chuyển sang bong bóng màu xanh ở góc trái dưới màn hình. Bong bóng này chỉ hiện với tài khoản seller/admin và tự cập nhật hội thoại mới.
        </p>
      </div>
    </RoleShell>
  );
}
