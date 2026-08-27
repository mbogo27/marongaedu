"use client";

import { useActionState } from "react";
import { submitContactAction } from "@/lib/actions/courses";

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContactAction, undefined as { error?: string; success?: boolean } | undefined);

  if (state?.success) {
    return (
      <p className="rounded-2xl border border-teal-100 bg-teal-50 px-6 py-8 text-center text-teal-700">
        Thanks — your message has been sent. We&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-teal-100 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink/70">
            Name
          </label>
          <input id="name" name="name" required className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink/70">
            Email
          </label>
          <input id="email" name="email" type="email" required className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="text-sm font-medium text-ink/70">
          Subject
        </label>
        <input id="subject" name="subject" required className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium text-ink/70">
          Message
        </label>
        <textarea id="message" name="message" required rows={5} minLength={10} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
