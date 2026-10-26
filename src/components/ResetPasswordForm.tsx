"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { Field, FormMessage, primaryButtonClass } from "@/components/ui/Field";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resetPasswordAction, undefined);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Set a new password</h1>
      <p className="mt-1 text-sm text-ink/70">You&apos;ll be signed out everywhere and asked to log in again.</p>
      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="token" value={token} />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          error={state?.fieldErrors?.password?.[0]}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <Field
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword?.[0]}
        />
        <FormMessage error={state?.error} />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
