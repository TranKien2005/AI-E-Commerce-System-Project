import { AdminPageHeader } from "@/components/AdminShell";
import AdminSellerRequestsTable from "@/components/AdminSellerRequestsTable";

export default function AdminSellerRequestsPage() {
  return (
    <>
      <AdminPageHeader eyebrow="Seller onboarding" title="Duyệt yêu cầu mở cửa hàng" description="Trang chi tiết giúp admin lọc, sắp xếp hồ sơ seller theo trạng thái, điểm tin cậy, ngành hàng và ngày gửi trước khi ra quyết định." />
      <AdminSellerRequestsTable />
    </>
  );
}
