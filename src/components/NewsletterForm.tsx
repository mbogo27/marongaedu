"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type SimpleFormState } from "@/lib/actions/courses";

export default function NewsletterForm() {
  const [state, action, pending] = useActionState<SimpleFormState, FormData>(subscribeNewsletterAction, undefined);

  if (state?.success) {
    return (
      <p role="status" className="mt-6 text-sm text-gold-200">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 flex max-w-sm flex-wrap gap-2" aria-label="Newsletter sign-up">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address for the newsletter
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="min-w-0 flex-1 rounded-full border border-teal-600 bg-teal-900/40 px-4 py-2 text-sm text-white placeholder:text-teal-100/70 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-gold-400 disabled:opacity-60"
      >
        {pending ? "…" : "Subscribe"}
      </button>
      {state?.error && (
        <p role="alert" className="basis-full text-xs text-red-200">
          {state.error}
        </p>
      )}
    </form>
  );
}
