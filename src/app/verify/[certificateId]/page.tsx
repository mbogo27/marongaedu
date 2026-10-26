import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import type { CertificateSnapshot } from "@/lib/certificates";

export const metadata: Metadata = { title: "Verify certificate", robots: { index: false } };

/** Public verification: valid / revoked / not found (spec §9). Looks up by the short code (or legacy UUID). */
export default async function VerifyCertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const code = decodeURIComponent(certificateId).trim().toUpperCase();
  const [certificate, general] = await Promise.all([
    db.certificate.findFirst({ where: { OR: [{ code }, { id: certificateId }] } }),
    getSetting("general"),
  ]);
  const snap = certificate?.snapshot as unknown as CertificateSnapshot | undefined;
  const revoked = !!certificate?.revokedAt;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
          {certificate && snap ? (
            <>
              <span
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${revoked ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                  <path d={revoked ? "M6 6l12 12M18 6L6 18" : "M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z"} stroke="currentColor" strokeWidth={revoked ? 2 : 0} />
                </svg>
              </span>
              <h1 className="mt-4 font-serif text-2xl text-teal-900">{revoked ? "Certificate revoked" : "Certificate verified"}</h1>
              <p className="mt-2 text-ink/80">
                {revoked
                  ? `This certificate was issued by ${general.siteName} but is no longer valid.`
                  : `This certificate is valid and was issued by ${general.siteName}.`}
              </p>
              <dl className="mt-6 space-y-2 rounded-xl bg-teal-50/60 p-4 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/70">Learner</dt>
                  <dd className="font-medium text-ink">{snap.learnerName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/70">Course</dt>
                  <dd className="text-right font-medium text-ink">{snap.courseTitle}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/70">Completed</dt>
                  <dd className="font-medium text-ink">{formatDate(snap.completedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/70">Certificate ID</dt>
                  <dd className="font-mono text-xs text-ink">{certificate.code}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-teal-900">Certificate not found</h1>
              <p className="mt-2 text-ink/80">We could not find a certificate with that ID. Check the code and try again.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
