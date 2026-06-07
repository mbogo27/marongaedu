"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Demo only — no real authentication. Any details are accepted.
    setTimeout(() => router.push("/dashboard"), 600);
  }

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex rounded-full bg-teal-50 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full py-2 transition ${
                mode === "login" ? "bg-white text-teal-700 shadow-sm" : "text-ink/50"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full py-2 transition ${
                mode === "signup" ? "bg-white text-teal-700 shadow-sm" : "text-ink/50"
              }`}
            >
              Sign up
            </button>
          </div>

          <h1 className="font-serif text-2xl text-teal-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {mode === "login"
              ? "Log in to continue your courses."
              : "Join Maronga Dental Academy to start learning."}
          </p>

          <button
            type="button"
            onClick={() => { setSubmitting(true); setTimeout(() => router.push("/dashboard"), 600); }}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-teal-100 px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-teal-50"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.7 4.2-16.9 10.3z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 26.9 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.4 40 16.1 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.5l6.6 5.4C41.5 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/40">
            <span className="h-px flex-1 bg-teal-100" />
            or
            <span className="h-px flex-1 bg-teal-100" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-ink/70">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-ink/70">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <p className="mt-1.5 text-xs text-gold-600">
                Demo tip: this is a stub — type anything in both fields and click {mode === "login" ? "Log in" : "Create account"}.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Signing you in…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink/40">
            Demo build — this is a stub. Any email and password will sign
            you in. Looking for the back office?{" "}
            <Link href="/admin/login" className="text-teal-600 hover:underline">
              Admin login
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
