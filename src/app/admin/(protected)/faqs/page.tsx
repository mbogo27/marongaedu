import { db } from "@/lib/db";
import FaqForm from "@/components/admin/FaqForm";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { deleteFaqAction, moveFaqAction } from "@/lib/actions/admin/faqs";
import { PageHeader, dangerBtn } from "@/components/admin/ui";
import { sanitizeRichText } from "@/lib/sanitize";

export default async function AdminFaqsPage() {
  const faqs = await db.faq.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader title="FAQs" />
      <p className="mt-1 text-sm text-ink/70">Shown on the public /faq page, in this order.</p>
      <ul className="mt-6 space-y-3">
        {faqs.map((f, i) => (
          <li key={f.id} className="rounded-2xl border border-teal-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{f.question}</p>
                <div className="mt-1 text-sm text-ink/70" dangerouslySetInnerHTML={{ __html: sanitizeRichText(f.answer) }} />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {i > 0 && <ConfirmAction action={moveFaqAction.bind(null, f.id, "up")}>↑<span className="sr-only"> Move up</span></ConfirmAction>}
                {i < faqs.length - 1 && <ConfirmAction action={moveFaqAction.bind(null, f.id, "down")}>↓<span className="sr-only"> Move down</span></ConfirmAction>}
                <FaqForm faq={f} />
                <ConfirmAction className={dangerBtn} confirm="Delete this FAQ?" action={deleteFaqAction.bind(null, f.id)}>Delete</ConfirmAction>
              </div>
            </div>
          </li>
        ))}
        {faqs.length === 0 && <li className="rounded-2xl border border-dashed border-teal-200 px-4 py-8 text-center text-sm text-ink/70">No FAQs yet.</li>}
      </ul>
      <div className="mt-6">
        <h2 className="font-serif text-lg text-teal-900">Add an FAQ</h2>
        <FaqForm />
      </div>
    </div>
  );
}
