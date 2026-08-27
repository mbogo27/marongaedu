"use client";

import { use, useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/lib/actions/auth";

export default function ResetPasswordForm({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resetPasswordAction, undefined);
  const { token } = use(searchParams);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Set a new password</h1>
      <form action={action} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token" value={token ?? ""} />
        <div>
          <label htmlFor="password" className="text-sm font-medium text-ink/70">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-ink/70">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
