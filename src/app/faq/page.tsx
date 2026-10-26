import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitize";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about courses, payments, certificates and refunds." };

export default async function FaqPage() {
  const faqs = await db.faq.findMany({ orderBy: { sortOrder: "asc" } });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <SiteHeader />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-serif text-3xl text-teal-900">Frequently asked questions</h1>
          <div className="mt-8 divide-y divide-teal-100 rounded-2xl border border-teal-100 bg-white">
            {faqs.map((item) => (
              <details key={item.id} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                  {item.question}
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-teal-700 transition group-open:rotate-45" aria-hidden="true">
                    <path d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5V4z" />
                  </svg>
                </summary>
                <div className="mt-2 text-sm text-ink/80 [&_a]:text-teal-800 [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.answer) }} />
              </details>
            ))}
            {faqs.length === 0 && <p className="px-6 py-8 text-sm text-ink/70">No questions have been added yet.</p>}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
