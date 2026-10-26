import { getSetting } from "@/lib/settings";
import LegalEditor from "@/components/admin/LegalEditor";
import { SettingsCard } from "@/components/admin/settings-ui";

export default async function LegalSettingsPage() {
  const legal = await getSetting("legal");
  return (
    <SettingsCard title="Legal pages" id="legal" description="Shown at /terms, /privacy and /refund-policy. Content is sanitised on save and when rendered.">
      <LegalEditor legal={legal} />
    </SettingsCard>
  );
}
