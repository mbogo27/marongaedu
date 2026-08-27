import LegalPageLayout from "@/components/LegalPageLayout";
import { getSetting, type LegalSettings } from "@/lib/settings";

export default async function RefundPolicyPage() {
  const legal = await getSetting<LegalSettings>("legal");
  return <LegalPageLayout title="Refund Policy" html={legal.refundPolicy} />;
}
