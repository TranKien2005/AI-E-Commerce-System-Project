import { AdminPageHeader } from "@/components/AdminShell";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Admin control plane"
        title="Tổng quan vận hành hệ thống"
        description="Dashboard lấy metrics, hàng chờ và audit log trực tiếp từ backend. Đăng nhập admin để xem dữ liệu thật."
      />
      <AdminDashboardClient />
    </>
  );
}
