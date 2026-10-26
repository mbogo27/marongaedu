"use client";

import { useActionState, type ReactNode } from "react";
import type { SettingsState } from "@/lib/actions/admin/settings";

/** <form> wrapper that shows save status. Fields are passed as (server-rendered) children. */
export default function SettingsForm({
  action,
  children,
  className = "grid gap-4 sm:grid-cols-2",
  submitLabel = "Save",
}: {
  action: (prev: SettingsState, fd: FormData) => Promise<SettingsState>;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {pending ? "Saving…" : submitLabel}
        </button>
        <span role="status" aria-live="polite" className="text-sm">
          {state?.ok && <span className="text-teal-800">Saved.</span>}
          {state?.error && <span className="text-red-700">{state.error}</span>}
        </span>
      </div>
    </form>
  );
}
