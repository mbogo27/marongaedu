"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Demo only — no real authentication. Any details are accepted.
    setTimeout(() => router.push("/admin"), 600);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-teal-900 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 font-serif text-lg text-paper">
            M
          </span>
          <div>
            <p className="font-serif text-lg leading-tight text-teal-900">Maronga</p>
            <p className="text-xs text-ink/50">Instructor &amp; admin sign-in</p>
          </div>
        </div>

        <h1 className="mt-6 font-serif text-2xl text-teal-900">Back office login</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sign in to manage courses, see enrollments and review your students.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="admin-email" className="text-sm font-medium text-ink/70">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              required
              defaultValue="dr.maronga@marongadental.ac.ke"
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-sm font-medium text-ink/70">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <p className="mt-1.5 text-xs text-gold-600">
              Demo tip: this is a stub — type anything and click &ldquo;Log in to back office&rdquo;.
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? "Signing you in…" : "Log in to back office"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/40">
          Demo build — this is a stub. Any email and password will sign you
          in.{" "}
          <Link href="/login" className="text-teal-600 hover:underline">
            Looking for the learner sign-in?
          </Link>
        </p>
      </div>
    </main>
  );
}
