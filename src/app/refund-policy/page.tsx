import LegalPageLayout from "@/components/LegalPageLayout";
import { getSetting } from "@/lib/settings";

export default async function RefundPolicyPage() {
  const legal = await getSetting("legal");
  return <LegalPageLayout title="Refund Policy" html={legal.refundPolicy} />;
}
