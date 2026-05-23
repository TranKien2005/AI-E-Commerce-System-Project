import { AdminPageHeader } from "@/components/AdminShell";
import AdminDashboardClient from "@/components/AdminDashboardClient";
import { adminCopy } from "@/lib/copy";

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.dashboard.eyebrow} title={adminCopy.dashboard.title} description={adminCopy.dashboard.description} />
      <AdminDashboardClient />
    </>
  );
}
