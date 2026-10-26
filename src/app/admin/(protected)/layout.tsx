import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/dal";
import { getSetting } from "@/lib/settings";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const general = await getSetting("general");
  return (
    <AdminShell adminName={admin.name} siteName={general.siteName}>
      {children}
    </AdminShell>
  );
}
