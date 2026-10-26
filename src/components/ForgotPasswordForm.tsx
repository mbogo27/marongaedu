"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { Field, FormMessage, primaryButtonClass } from "@/components/ui/Field";

export default function ForgotPasswordForm({ captchaSlot }: { captchaSlot?: ReactNode }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(forgotPasswordAction, undefined);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Forgot your password?</h1>
      <p className="mt-1 text-sm text-ink/70">Enter your email and we&apos;ll send you a link to reset it.</p>

      {state?.message ? (
        <div className="mt-6">
          <FormMessage message={state.message} />
        </div>
      ) : (
        <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={state?.fieldErrors?.email?.[0]}
          />
          {captchaSlot}
          <FormMessage error={state?.error} />
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink/70">
        <Link href="/login" className="font-medium text-teal-800 underline-offset-2 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
