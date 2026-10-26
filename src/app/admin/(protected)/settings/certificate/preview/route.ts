import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/dal";
import { getSetting } from "@/lib/settings";
import { getStorage } from "@/lib/storage";
import { generateCertificatePdf } from "@/lib/pdf";
import { verifyUrlFor } from "@/lib/certificates";

/** Renders the saved certificate template with sample data (admin only, not cached). */
export async function GET() {
  if (!(await getAdminOrNull())) return new Response(null, { status: 404 });
  const template = await getSetting("certificateTemplate");
  const storage = getStorage();
  const [background, signature] = await Promise.all([
    template.backgroundKey ? storage.getObject(template.backgroundKey) : null,
    template.signatureKey ? storage.getObject(template.signatureKey) : null,
  ]);
  const bytes = await generateCertificatePdf({
    snapshot: { learnerName: "Amina Wanjiru", courseTitle: "Endodontic Fundamentals: Diagnosis to Obturation", completedAt: new Date().toISOString(), instructorName: template.signatureName },
    code: "DENT-SAMPLE-0000",
    issuedAt: new Date(),
    verifyUrl: verifyUrlFor("DENT-SAMPLE-0000"),
    template,
    background: background ? { bytes: background.body, contentType: background.contentType } : undefined,
    signature: signature ? { bytes: signature.body, contentType: signature.contentType } : undefined,
  });
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="certificate-preview.pdf"', "Cache-Control": "no-store" },
  });
}
