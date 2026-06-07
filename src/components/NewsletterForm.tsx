"use client";

export default function NewsletterForm() {
  return (
    <form className="mt-6 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="newsletter" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter"
        type="email"
        placeholder="you@example.com"
        className="w-full rounded-full border border-teal-700 bg-teal-900/40 px-4 py-2 text-sm placeholder:text-teal-100/50 focus:border-gold-400 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-gold-400"
      >
        Subscribe
      </button>
    </form>
  );
}
