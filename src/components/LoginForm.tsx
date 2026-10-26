"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";
import { Field, FormMessage, primaryButtonClass } from "@/components/ui/Field";

export default function LoginForm({
  redirectTo,
  socialSlot,
  hint,
}: {
  redirectTo?: string;
  /** Server-rendered social sign-in buttons (renders nothing while disabled). */
  socialSlot?: ReactNode;
  hint?: ReactNode;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Welcome back</h1>
      <p className="mt-1 text-sm text-ink/70">Log in to continue your courses.</p>

      {socialSlot}

      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          error={state?.fieldErrors?.email?.[0]}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state?.fieldErrors?.password?.[0]}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink/80">
            <input type="checkbox" name="remember" className="h-4 w-4 rounded border-teal-300 text-teal-700" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-teal-800 underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </div>
        <FormMessage error={state?.error} />
        <button type="submit" disabled={pending} className={`mt-1 ${primaryButtonClass}`}>
          {pending ? "Signing you in…" : "Log in"}
        </button>
      </form>

      {hint}
      <p className="mt-6 text-center text-sm text-ink/70">
        New here?{" "}
        <Link href="/signup" className="font-medium text-teal-800 underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
