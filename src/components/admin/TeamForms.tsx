"use client";

import { useActionState } from "react";
import { inviteAdminAction, promoteUserAction, type TeamState } from "@/lib/actions/admin/team";

function Row({ label, button, action }: { label: string; button: string; action: (p: TeamState, fd: FormData) => Promise<TeamState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium text-ink/80">
        {label}
        <input name="email" type="email" required className="mt-1 block w-72 max-w-full rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
      </label>
      <button type="submit" disabled={pending} className="rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
        {pending ? "Working…" : button}
      </button>
      <p role="status" aria-live="polite" className="w-full text-sm">
        {state?.error && <span className="text-red-700">{state.error}</span>}
        {state?.message && <span className="text-teal-800">{state.message}</span>}
      </p>
    </form>
  );
}

export function InviteAdminForm() {
  return <Row label="Invite by email" button="Send invitation" action={inviteAdminAction} />;
}

export function PromoteUserForm() {
  return <Row label="Promote an existing account" button="Promote to admin" action={promoteUserAction} />;
}
