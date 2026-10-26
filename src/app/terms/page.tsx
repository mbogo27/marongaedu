import LegalPageLayout from "@/components/LegalPageLayout";
import { getSetting } from "@/lib/settings";

export default async function TermsPage() {
  const legal = await getSetting("legal");
  return <LegalPageLayout title="Terms of Service" html={legal.terms} />;
}
