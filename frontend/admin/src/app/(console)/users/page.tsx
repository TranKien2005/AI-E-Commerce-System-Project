import { AdminPageHeader } from "@/components/AdminShell";
import AdminUsersTable from "@/components/AdminUsersTable";

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader eyebrow="User governance" title="Quản lý người dùng & phân quyền" description="Trang chi tiết cho phép admin lọc, sắp xếp, chọn tài khoản để xem hồ sơ tóm tắt và thực hiện hành động quản trị." />
      <AdminUsersTable />
    </>
  );
}
