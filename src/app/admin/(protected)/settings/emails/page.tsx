import { getSetting } from "@/lib/settings";
import EmailTemplatesEditor from "@/components/admin/EmailTemplatesEditor";
import { SettingsCard } from "@/components/admin/settings-ui";
import { env } from "@/lib/env";

export default async function EmailSettingsPage() {
  const [overrides, general, branding] = await Promise.all([getSetting("emailTemplates"), getSetting("general"), getSetting("branding")]);
  return (
    <SettingsCard
      title="Email templates"
      id="emails"
      description={`Edit the subject and body of every transactional email. Anything you do not change falls back to the built-in template. Delivery: ${env.EMAIL_PROVIDER} provider.`}
    >
      <EmailTemplatesEditor overrides={overrides} brand={{ siteName: general.siteName, primaryColor: branding.primaryColor, accentColor: branding.secondaryColor }} />
    </SettingsCard>
  );
}
