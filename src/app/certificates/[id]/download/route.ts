import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { generateCertificatePdf } from "@/lib/pdf";
import { getSetting, type CertificateTemplateSettings } from "@/lib/settings";

export async function GET(_req: Request, ctx: RouteContext<"/certificates/[id]/download">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  if (!user.verifiedAt) {
    return new Response("Verify your email to download certificates.", { status: 403 });
  }

  const certificate = await db.certificate.findUnique({
    where: { id },
    include: { enrollment: { include: { course: true, user: true } } },
  });
  if (!certificate || (certificate.enrollment.userId !== user.id && user.role !== "ADMIN")) {
    return new Response(null, { status: 404 });
  }

  const template = await getSetting<CertificateTemplateSettings>("certificateTemplate");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const bytes = await generateCertificatePdf({
    learnerName: certificate.enrollment.user.name,
    courseTitle: certificate.enrollment.course.title,
    issuedAt: certificate.issuedAt,
    certificateId: certificate.id,
    signatureName: template.signatureName,
    signatureTitle: template.signatureTitle,
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    verifyUrl: `${siteUrl}/verify/${certificate.id}`,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificate.id}.pdf"`,
    },
  });
}
