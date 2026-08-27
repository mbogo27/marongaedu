import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const certificate = await db.certificate.findUnique({
    where: { id: certificateId },
    include: { enrollment: { include: { course: true, user: true } } },
  });

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
          {certificate ? (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                  <path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" />
                </svg>
              </span>
              <h1 className="mt-4 font-serif text-2xl text-teal-900">Certificate verified</h1>
              <p className="mt-2 text-ink/70">This certificate is valid and was issued by Maronga Dental Academy.</p>
              <dl className="mt-6 space-y-2 rounded-xl bg-teal-50/60 p-4 text-left text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink/50">Learner</dt>
                  <dd className="font-medium text-ink">{certificate.enrollment.user.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink/50">Course</dt>
                  <dd className="font-medium text-ink">{certificate.enrollment.course.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink/50">Issued</dt>
                  <dd className="font-medium text-ink">{formatDate(certificate.issuedAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink/50">Certificate ID</dt>
                  <dd className="font-mono text-xs text-ink">{certificate.id}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-teal-900">Certificate not found</h1>
              <p className="mt-2 text-ink/70">We couldn&apos;t verify a certificate with this ID.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
