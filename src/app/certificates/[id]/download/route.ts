import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getCertificatePdf } from "@/lib/certificates";

/** Owner or admin only; owners need a verified email and a non-revoked certificate (spec §9). */
export async function GET(_req: Request, ctx: RouteContext<"/certificates/[id]/download">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const certificate = await db.certificate.findUnique({ where: { id }, include: { enrollment: { select: { userId: true } } } });
  const isAdmin = user.role === "ADMIN";
  if (!certificate || (certificate.enrollment.userId !== user.id && !isAdmin)) return new Response("Not found", { status: 404 });

  if (!isAdmin && !user.emailVerifiedAt) {
    return new Response("Verify your email to download certificates.", { status: 403 });
  }
  if (certificate.revokedAt && !isAdmin) return new Response("This certificate has been revoked.", { status: 410 });

  const bytes = await getCertificatePdf(certificate);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificate.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
