"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction } from "@/lib/actions/courses";

export default function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, undefined as { error?: string; success?: boolean } | undefined);

  if (state?.success) {
    return <p className="mt-6 text-sm text-gold-300">Thanks for subscribing! Watch your inbox for new course announcements.</p>;
  }

  return (
    <form action={action} className="mt-6 flex max-w-sm gap-2">
      <label htmlFor="newsletter" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="w-full rounded-full border border-teal-700 bg-teal-900/40 px-4 py-2 text-sm placeholder:text-teal-100/50 focus:border-gold-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-gold-400 disabled:opacity-60"
      >
        {pending ? "..." : "Subscribe"}
      </button>
      {state?.error && <p className="basis-full text-xs text-red-300">{state.error}</p>}
    </form>
  );
}
