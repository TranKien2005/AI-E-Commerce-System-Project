import { AdminPageHeader } from "@/components/AdminShell";
import AdminUsersTable from "@/components/AdminUsersTable";
import { adminCopy } from "@/lib/copy";

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.users.eyebrow} title={adminCopy.users.title} description={adminCopy.users.description} />
      <AdminUsersTable />
    </>
  );
}
