"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, googleStubAction, type AuthFormState } from "@/lib/actions/auth";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Welcome back</h1>
      <p className="mt-1 text-sm text-ink/60">Log in to continue your courses.</p>

      <form action={googleStubAction}>
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-teal-100 px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-teal-50"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/40">
        <span className="h-px flex-1 bg-teal-100" />
        or
        <span className="h-px flex-1 bg-teal-100" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink/70">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          {state?.fieldErrors?.email && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-ink/70">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          {state?.fieldErrors?.password && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink/70">
            <input type="checkbox" name="remember" className="h-4 w-4 rounded border-teal-300 text-teal-600" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-teal-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? "Signing you in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink/40">
        Demo credentials: any seeded account with password{" "}
        <code className="rounded bg-teal-50 px-1 py-0.5 text-teal-700">Demo@1234</code>.
      </p>
      <p className="mt-3 text-center text-sm text-ink/60">
        New here?{" "}
        <Link href="/signup" className="font-medium text-teal-700 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink/40">
        <Link href="/admin/login" className="hover:underline">
          Admin login
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.7 4.2-16.9 10.3z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 26.9 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.4 40 16.1 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.5l6.6 5.4C41.5 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export { GoogleIcon };
