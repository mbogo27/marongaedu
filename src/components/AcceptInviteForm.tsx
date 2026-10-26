"use client";

import { useActionState } from "react";
import { acceptInviteAction, type InviteState } from "@/lib/actions/invite";
import { Field, FormMessage, primaryButtonClass } from "@/components/ui/Field";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export default function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInviteAction, undefined);
  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Join the admin team</h1>
      <p className="mt-1 text-sm text-ink/70">
        You were invited as <strong>{email}</strong>. Choose your name and a password.
      </p>
      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="token" value={token} />
        <Field label="Full name" name="name" autoComplete="name" required error={state?.fieldErrors?.name?.[0]} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} error={state?.fieldErrors?.password?.[0]} hint={`At least ${PASSWORD_MIN_LENGTH} characters.`} />
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required error={state?.fieldErrors?.confirmPassword?.[0]} />
        <FormMessage error={state?.error} />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Creating account…" : "Create admin account"}
        </button>
      </form>
    </div>
  );
}
