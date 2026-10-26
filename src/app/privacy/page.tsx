import LegalPageLayout from "@/components/LegalPageLayout";
import { getSetting } from "@/lib/settings";

export default async function PrivacyPage() {
  const legal = await getSetting("legal");
  return <LegalPageLayout title="Privacy Policy" html={legal.privacy} />;
}
