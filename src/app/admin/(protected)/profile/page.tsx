import { requireAdmin } from "@/lib/dal";
import AccountPanel from "@/components/dashboard/AccountPanel";

export default async function AdminProfilePage() {
  const admin = await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Your profile</h1>
      <p className="mt-1 text-sm text-ink/60">This feeds the public instructor bio shown across the site.</p>
      <div className="mt-6 max-w-2xl">
        <AccountPanel name={admin.name} bio={admin.bio} notifyEmail={admin.notifyEmail} notifyMarketing={admin.notifyMarketing} hideDelete />
      </div>
    </div>
  );
}
