"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthFormState } from "@/lib/actions/auth";

export default function ForgotPasswordForm() {
  const [, action, pending] = useActionState<AuthFormState, FormData>(forgotPasswordAction, undefined);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Forgot your password?</h1>
      <p className="mt-1 text-sm text-ink/60">
        Enter your email and we&apos;ll send you a reset link (simulated — check the admin notifications feed).
      </p>

      {submitted ? (
        <p className="mt-6 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700">
          If an account exists for that email, we&apos;ve sent a reset link.
        </p>
      ) : (
        <form
          action={async (formData) => {
            await action(formData);
            setSubmitted(true);
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink/70">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink/60">
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
