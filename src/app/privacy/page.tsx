import LegalPageLayout from "@/components/LegalPageLayout";
import { getSetting, type LegalSettings } from "@/lib/settings";

export default async function PrivacyPage() {
  const legal = await getSetting<LegalSettings>("legal");
  return <LegalPageLayout title="Privacy Policy" html={legal.privacy} />;
}
