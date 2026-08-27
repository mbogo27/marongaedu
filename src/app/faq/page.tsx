import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const FAQS = [
  {
    q: "Are courses recognized for CPD/CME points?",
    a: "Accreditation varies by course and regulatory body. Check each course's description page for accreditation details, or contact us before enrolling.",
  },
  {
    q: "How long do I have access to a course?",
    a: "Once enrolled, you have full lifetime access to that course — including any future updates to its content.",
  },
  {
    q: "What payment methods are accepted?",
    a: "M-Pesa and major debit/credit cards. Prices are shown in Kenyan Shillings (KES) with an optional USD display toggle at checkout.",
  },
  {
    q: "Can I get a refund?",
    a: "See our Refund Policy page for full details on eligibility and the request process.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes — completing 100% of a course's lessons automatically issues a downloadable, publicly verifiable certificate.",
  },
  {
    q: "Can I preview a course before enrolling?",
    a: "Every course has a free preview video, and most courses mark 1-2 lessons as free previews you can watch in full before enrolling.",
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-serif text-3xl text-teal-900">Frequently asked questions</h1>
          <div className="mt-8 divide-y divide-teal-100 rounded-2xl border border-teal-100 bg-white">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                  {item.q}
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-teal-600 transition group-open:rotate-45">
                    <path d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5V4z" />
                  </svg>
                </summary>
                <p className="mt-2 text-sm text-ink/70">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
