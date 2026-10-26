import "server-only";
import { Prisma, type Certificate } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { randomCode } from "@/lib/tokens";
import { getSetting } from "@/lib/settings";
import { getStorage } from "@/lib/storage";
import { generateCertificatePdf } from "@/lib/pdf";
import { sendEmail, absUrl } from "@/lib/email/send";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";

export type CertificateSnapshot = { learnerName: string; courseTitle: string; completedAt: string; instructorName: string };

export function verifyUrlFor(code: string) {
  return `${env.APP_URL.replace(/\/$/, "")}/verify/${code}`;
}

/** DENT-7K3Q-9XPA style: configurable prefix + two unambiguous 4-char groups. */
export function makeCertificateCode(prefix: string): string {
  return `${prefix.toUpperCase()}-${randomCode(4)}-${randomCode(4)}`;
}

/**
 * Issue the certificate for a completed enrollment. Idempotent: the unique
 * `enrollmentId` guarantees at most one per enrollment even under concurrent
 * completions. Stores a snapshot so later renames don't alter issued
 * certificates (spec §9).
 */
export async function issueCertificate(enrollmentId: string): Promise<{ certificate: Certificate; created: boolean } | null> {
  const existing = await db.certificate.findUnique({ where: { enrollmentId } });
  if (existing) return { certificate: existing, created: false };

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: true, course: { include: { instructor: true } } },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") return null;

  const [codeSettings, template] = await Promise.all([getSetting("certificateCode"), getSetting("certificateTemplate")]);
  const snapshot: CertificateSnapshot = {
    learnerName: enrollment.user.name,
    courseTitle: enrollment.course.title,
    completedAt: (enrollment.completedAt ?? new Date()).toISOString(),
    instructorName: enrollment.course.instructor.name || template.signatureName,
  };

  let certificate: Certificate | null = null;
  for (let attempt = 0; attempt < 5 && !certificate; attempt++) {
    try {
      certificate = await db.certificate.create({
        data: { enrollmentId, code: makeCertificateCode(codeSettings.prefix), templateId: enrollment.course.certificateTemplate, snapshot },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
      // Unique violation: either a concurrent issue for this enrollment, or a code collision.
      const raced = await db.certificate.findUnique({ where: { enrollmentId } });
      if (raced) return { certificate: raced, created: false };
    }
  }
  if (!certificate) throw new Error("Could not allocate a unique certificate code");

  await notify("course_completed", { userId: enrollment.userId, courseId: enrollment.courseId, course: snapshot.courseTitle });
  await notify("certificate_issued", { userId: enrollment.userId, courseId: enrollment.courseId, course: snapshot.courseTitle, code: certificate.code });
  track("course_completed", { courseId: enrollment.courseId });
  track("certificate_issued", { courseId: enrollment.courseId, code: certificate.code });
  await sendEmail(
    "certificateIssued",
    enrollment.user.email,
    { name: enrollment.user.name, course: snapshot.courseTitle, code: certificate.code },
    { link: `/certificates/${certificate.id}`, userId: enrollment.userId }
  );
  return { certificate, created: true };
}

/** Render (or fetch the cached) PDF for a certificate; cached in private storage (spec §9). */
export async function getCertificatePdf(certificate: Certificate): Promise<Buffer> {
  const storage = getStorage();
  const key = certificate.pdfKey ?? `private/certificates/${certificate.id}.pdf`;
  const cached = await storage.getObject(key);
  if (cached) return cached.body;

  const template = await getSetting("certificateTemplate");
  const snapshot = certificate.snapshot as unknown as CertificateSnapshot;

  const [background, signature] = await Promise.all([
    template.backgroundKey ? storage.getObject(template.backgroundKey) : null,
    template.signatureKey ? storage.getObject(template.signatureKey) : null,
  ]);

  const bytes = Buffer.from(
    await generateCertificatePdf({
      snapshot,
      code: certificate.code,
      issuedAt: certificate.issuedAt,
      verifyUrl: verifyUrlFor(certificate.code),
      template,
      background: background ? { bytes: background.body, contentType: background.contentType } : undefined,
      signature: signature ? { bytes: signature.body, contentType: signature.contentType } : undefined,
    })
  );
  await storage.putObject(key, bytes, "application/pdf");
  if (!certificate.pdfKey) await db.certificate.update({ where: { id: certificate.id }, data: { pdfKey: key } });
  return bytes;
}

export function linkedInAddToProfileUrl(opts: { name: string; code: string; issuedAt: Date; verifyUrl: string; orgName: string }) {
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: opts.name,
    organizationName: opts.orgName,
    issueYear: String(opts.issuedAt.getFullYear()),
    issueMonth: String(opts.issuedAt.getMonth() + 1),
    certUrl: opts.verifyUrl,
    certId: opts.code,
  });
  return `https://www.linkedin.com/profile/add?${p}`;
}

export { absUrl };
