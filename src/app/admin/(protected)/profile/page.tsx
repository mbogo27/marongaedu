import { requireAdmin } from "@/lib/dal";
import { hasPassword } from "@/lib/auth/users";
import { EmailForm, PasswordForm, ProfileForm } from "@/components/account/AccountForms";

export default async function AdminProfilePage() {
  const admin = await requireAdmin();
  const hasPw = await hasPassword(admin.id);

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Your profile</h1>
      <p className="mt-1 text-sm text-ink/70">The name, photo and bio here feed the public instructor block across the site.</p>
      <div className="mt-6 max-w-2xl space-y-6">
        <ProfileForm name={admin.name} bio={admin.bio} />
        <EmailForm email={admin.email} verified={!!admin.emailVerifiedAt} hasPassword={hasPw} />
        <PasswordForm hasPassword={hasPw} />
      </div>
    </div>
  );
}
