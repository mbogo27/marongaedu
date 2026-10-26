"use client";

import { useActionState, useState } from "react";
import { saveFaqAction, type FaqState } from "@/lib/actions/admin/faqs";

export default function FaqForm({ faq }: { faq?: { id: string; question: string; answer: string } }) {
  const [open, setOpen] = useState(!faq);
  const [state, action, pending] = useActionState<FaqState, FormData>(saveFaqAction.bind(null, faq?.id ?? null), undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline">
        Edit
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2 rounded-xl border border-teal-100 bg-white p-4">
      <label className="block text-xs font-medium text-ink/80">
        Question
        <input name="question" defaultValue={faq?.question} required maxLength={300} className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-ink/80">
        Answer (basic HTML allowed)
        <textarea name="answer" defaultValue={faq?.answer} required rows={3} maxLength={5000} className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {pending ? "Saving…" : faq ? "Save" : "Add FAQ"}
        </button>
        {faq && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink/80 hover:underline">
            Close
          </button>
        )}
        {state?.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state?.ok && <span role="status" className="text-sm text-teal-800">Saved.</span>}
      </div>
    </form>
  );
}
