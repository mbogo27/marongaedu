import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/dal";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
