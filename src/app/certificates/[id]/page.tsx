import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { linkedInAddToProfileUrl, verifyUrlFor, type CertificateSnapshot } from "@/lib/certificates";

export const metadata: Metadata = { title: "Certificate", robots: { index: false } };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/certificates/${id}`);

  const certificate = await db.certificate.findUnique({ where: { id }, include: { enrollment: { select: { userId: true } } } });
  if (!certificate) notFound();
  const isAdmin = user.role === "ADMIN";
  if (certificate.enrollment.userId !== user.id && !isAdmin) notFound();

  const [template, general] = await Promise.all([getSetting("certificateTemplate"), getSetting("general")]);
  const snap = certificate.snapshot as unknown as CertificateSnapshot;
  const verifyUrl = verifyUrlFor(certificate.code);
  const revoked = !!certificate.revokedAt;
  // Download / share need a verified email (spec §3.3); admins can always fetch for support.
  const canDownload = !revoked && (!!user.emailVerifiedAt || isAdmin);

  return (
    <>
      <SiteHeader />
      {!user.emailVerifiedAt && !isAdmin && <EmailVerifyBanner />}
      <main id="main" className="flex-1 bg-teal-50/30 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {revoked && (
            <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800">
              This certificate has been revoked because the enrollment it belongs to is no longer active.
            </p>
          )}
          <div
            className={`relative overflow-hidden rounded-2xl border-4 bg-[#faf7f2] p-6 text-center shadow-lg sm:p-16 ${revoked ? "opacity-60" : ""}`}
            style={{ borderColor: template.primaryColor }}
          >
            <div className="rounded-xl border p-6 sm:p-12" style={{ borderColor: template.accentColor }}>
              <p className="font-serif text-xl uppercase tracking-widest sm:text-2xl" style={{ color: template.primaryColor }}>
                Certificate of Completion
              </p>
              <p className="mt-8 text-sm text-ink/70">This certifies that</p>
              <p className="mt-2 font-serif text-3xl text-ink sm:text-4xl">{snap.learnerName}</p>
              <p className="mt-6 text-sm text-ink/70">has successfully completed</p>
              <p className="mt-2 font-serif text-xl italic sm:text-2xl" style={{ color: template.primaryColor }}>
                {snap.courseTitle}
              </p>
              <p className="mt-6 text-sm text-ink/70">Completed {formatDate(snap.completedAt)}</p>

              <div className="mx-auto mt-12 w-56 border-t border-ink/30 pt-2">
                <p className="font-serif italic text-ink">{template.signatureName}</p>
                <p className="text-xs text-ink/70">{template.signatureTitle}</p>
              </div>

              <p className="mt-10 text-xs text-ink/70">
                Certificate ID: <span className="font-mono">{certificate.code}</span>
              </p>
              <p className="mt-1 break-all text-xs text-ink/70">Verify: {verifyUrl}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {canDownload ? (
              <>
                <a
                  href={`/certificates/${certificate.id}/download`}
                  className="rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Download PDF
                </a>
                <a
                  href={linkedInAddToProfileUrl({ name: snap.courseTitle, code: certificate.code, issuedAt: certificate.issuedAt, verifyUrl, orgName: general.siteName })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-teal-300 px-6 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                >
                  Share on LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </>
            ) : !revoked ? (
              <p className="text-sm text-ink/80">Verify your email address to download or share this certificate.</p>
            ) : null}
            <Link href={`/verify/${certificate.code}`} className="text-sm text-teal-800 underline-offset-2 hover:underline">
              View public verification page →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
