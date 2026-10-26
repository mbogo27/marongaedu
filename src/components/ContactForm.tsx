"use client";

import { useActionState } from "react";
import { submitContactAction, type SimpleFormState } from "@/lib/actions/courses";
import { Field, FormMessage, inputClass, primaryButtonClass } from "@/components/ui/Field";

export default function ContactForm() {
  const [state, action, pending] = useActionState<SimpleFormState, FormData>(submitContactAction, undefined);

  if (state?.success) {
    return (
      <p role="status" className="rounded-2xl border border-teal-100 bg-teal-50 px-6 py-8 text-center text-teal-900">
        {state.message}
      </p>
    );
  }
  const fe = state?.fieldErrors;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-teal-100 bg-white p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" required error={fe?.name?.[0]} />
        <Field label="Email" name="email" type="email" autoComplete="email" required error={fe?.email?.[0]} />
      </div>
      <Field label="Subject" name="subject" required error={fe?.subject?.[0]} />
      <div>
        <label htmlFor="message" className="text-sm font-medium text-ink/80">
          Message
        </label>
        <textarea id="message" name="message" required rows={5} minLength={10} aria-invalid={fe?.message ? true : undefined} className={inputClass} />
        {fe?.message && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {fe.message[0]}
          </p>
        )}
      </div>
      <FormMessage error={state?.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
