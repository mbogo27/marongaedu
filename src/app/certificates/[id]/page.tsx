import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getSetting, type CertificateTemplateSettings } from "@/lib/settings";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/certificates/${id}`);

  const certificate = await db.certificate.findUnique({
    where: { id },
    include: { enrollment: { include: { course: true, user: true } } },
  });
  if (!certificate) notFound();
  if (certificate.enrollment.userId !== user.id && user.role !== "ADMIN") notFound();

  const template = await getSetting<CertificateTemplateSettings>("certificateTemplate");
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify/${certificate.id}`;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-teal-50/30 py-12">
        <div className="mx-auto max-w-3xl px-6">
          <div
            className="relative overflow-hidden rounded-2xl border-4 bg-[#faf7f2] p-10 text-center shadow-lg sm:p-16"
            style={{ borderColor: template.primaryColor }}
          >
            <div className="rounded-xl border p-8 sm:p-12" style={{ borderColor: template.accentColor }}>
              <p className="font-serif text-2xl uppercase tracking-widest" style={{ color: template.primaryColor }}>
                Certificate of Completion
              </p>
              <p className="mt-8 text-sm text-ink/60">This certifies that</p>
              <p className="mt-2 font-serif text-4xl text-ink">{certificate.enrollment.user.name}</p>
              <p className="mt-6 text-sm text-ink/60">has successfully completed</p>
              <p className="mt-2 font-serif text-2xl italic" style={{ color: template.primaryColor }}>
                {certificate.enrollment.course.title}
              </p>
              <p className="mt-6 text-sm text-ink/60">Issued {formatDate(certificate.issuedAt)}</p>

              <div className="mx-auto mt-12 w-56 border-t border-ink/30 pt-2">
                <p className="font-serif italic text-ink">{template.signatureName}</p>
                <p className="text-xs text-ink/50">{template.signatureTitle}</p>
              </div>

              <p className="mt-10 text-xs text-ink/40">Certificate ID: {certificate.id}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/certificates/${certificate.id}/download`}
              className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Download PDF
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-teal-100 px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Share on LinkedIn
            </a>
            <Link href={`/verify/${certificate.id}`} className="text-sm text-ink/50 hover:underline">
              View public verification page →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
