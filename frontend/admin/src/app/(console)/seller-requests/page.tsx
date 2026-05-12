import { AdminPageHeader } from "@/components/AdminShell";
import AdminSellerRequestsTable from "@/components/AdminSellerRequestsTable";
import { adminCopy } from "@/lib/copy";

export default function AdminSellerRequestsPage() {
  return (
    <>
      <AdminPageHeader eyebrow={adminCopy.sellerRequests.eyebrow} title={adminCopy.sellerRequests.title} description={adminCopy.sellerRequests.description} />
      <AdminSellerRequestsTable />
    </>
  );
}
