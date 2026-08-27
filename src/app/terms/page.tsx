import LegalPageLayout from "@/components/LegalPageLayout";
import { getSetting, type LegalSettings } from "@/lib/settings";

export default async function TermsPage() {
  const legal = await getSetting<LegalSettings>("legal");
  return <LegalPageLayout title="Terms of Service" html={legal.terms} />;
}
