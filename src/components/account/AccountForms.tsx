"use client";

import { useActionState, useTransition } from "react";
import {
  changeEmailAction,
  changePasswordAction,
  deleteAccountAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
  updateNotificationPrefsAction,
  updateProfileAction,
  type AccountFormState,
} from "@/lib/actions/account";
import { Field, FormMessage, primaryButtonClass, inputClass } from "@/components/ui/Field";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

function Section({ id, title, children, tone }: { id: string; title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={`rounded-2xl border p-6 ${tone === "danger" ? "border-red-200 bg-red-50/50" : "border-teal-100 bg-white"}`}
    >
      <h2 id={`${id}-h`} className={`font-serif text-lg ${tone === "danger" ? "text-red-800" : "text-teal-900"}`}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProfileForm({ name, bio }: { name: string; bio: string | null }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(updateProfileAction, undefined);
  return (
    <Section id="profile" title="Profile">
      <form action={action} className="space-y-4">
        <Field label="Full name" name="name" defaultValue={name} required error={state?.fieldErrors?.name?.[0]} />
        <div>
          <label htmlFor="bio" className="text-sm font-medium text-ink/80">
            Bio <span className="text-ink/70">(optional)</span>
          </label>
          <textarea id="bio" name="bio" defaultValue={bio ?? ""} rows={3} maxLength={1000} className={inputClass} />
        </div>
        <Field
          label="Profile photo"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mt-1 block w-full text-sm"
          error={state?.fieldErrors?.avatar?.[0]}
          hint="JPG, PNG, WebP or GIF up to 5 MB."
        />
        <FormMessage error={state?.error} message={state?.success} />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </Section>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(changePasswordAction, undefined);
  return (
    <Section id="password" title={hasPassword ? "Change password" : "Set a password"}>
      {!hasPassword && (
        <p className="mb-4 text-sm text-ink/70">You signed in without a password. Set one to also log in with your email.</p>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-3">
        {hasPassword && (
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            error={state?.fieldErrors?.currentPassword?.[0]}
          />
        )}
        <Field
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          error={state?.fieldErrors?.newPassword?.[0]}
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
        <div className="sm:col-span-3">
          <FormMessage error={state?.error} message={state?.success} />
          <button type="submit" disabled={pending} className={`mt-3 ${primaryButtonClass}`}>
            {pending ? "Saving…" : hasPassword ? "Update password" : "Set password"}
          </button>
        </div>
      </form>
    </Section>
  );
}

export function EmailForm({ email, verified, hasPassword }: { email: string; verified: boolean; hasPassword: boolean }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(changeEmailAction, undefined);
  return (
    <Section id="email" title="Email address">
      <p className="text-sm text-ink/80">
        Current: <strong>{email}</strong> · {verified ? "verified" : "not verified"}
      </p>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="New email" name="newEmail" type="email" autoComplete="email" required error={state?.fieldErrors?.newEmail?.[0]} />
        {hasPassword && (
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            error={state?.fieldErrors?.currentPassword?.[0]}
          />
        )}
        <div className="sm:col-span-2">
          <FormMessage error={state?.error} message={state?.success} />
          <button type="submit" disabled={pending} className={`mt-3 ${primaryButtonClass}`}>
            {pending ? "Sending…" : "Send confirmation link"}
          </button>
          <p className="mt-2 text-xs text-ink/70">Your email only changes after you confirm the new address.</p>
        </div>
      </form>
    </Section>
  );
}

export type SessionRow = { id: string; device: string; ip: string | null; lastActive: string; current: boolean };

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [pending, start] = useTransition();
  return (
    <Section id="sessions" title="Active sessions">
      <ul className="divide-y divide-teal-50">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium text-ink">
                {s.device} {s.current && <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">This device</span>}
              </p>
              <p className="text-xs text-ink/70">
                {s.ip ?? "Unknown IP"} · last active {s.lastActive}
              </p>
            </div>
            {!s.current && (
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => revokeSessionAction(s.id))}
                className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
              >
                Sign out
              </button>
            )}
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => revokeOtherSessionsAction())}
          className="mt-4 rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
        >
          Sign out of all other sessions
        </button>
      )}
    </Section>
  );
}

export function NotificationForm({ prefs }: { prefs: { courseUpdates: boolean; certificates: boolean; marketing: boolean } }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(updateNotificationPrefsAction, undefined);
  const box = "h-4 w-4 rounded border-teal-300 text-teal-700";
  return (
    <Section id="notifications" title="Email notifications">
      <form action={action} className="space-y-3 text-sm text-ink/80">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="courseUpdates" defaultChecked={prefs.courseUpdates} className={box} />
          Enrollment confirmations, payment and refund notices
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="certificates" defaultChecked={prefs.certificates} className={box} />
          Certificate issued
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="marketing" defaultChecked={prefs.marketing} className={box} />
          New course announcements
        </label>
        <p className="text-xs text-ink/70">Security emails (password, email changes, verification) are always sent.</p>
        <FormMessage error={state?.error} message={state?.success} />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </Section>
  );
}

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(deleteAccountAction, undefined);
  return (
    <Section id="delete" title="Delete account" tone="danger">
      <p className="text-sm text-red-900/80">
        This signs you out everywhere and anonymises your profile. Purchase records are kept for accounting. This cannot
        be undone.
      </p>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        {hasPassword ? (
          <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required error={state?.fieldErrors?.currentPassword?.[0]} />
        ) : (
          <Field label="Type your account email" name="confirmEmail" type="email" required error={state?.fieldErrors?.confirmEmail?.[0]} />
        )}
        <Field label='Type "DELETE" to confirm' name="confirm" required autoComplete="off" error={state?.fieldErrors?.confirm?.[0]} />
        <div className="sm:col-span-2">
          <FormMessage error={state?.error} />
          <button
            type="submit"
            disabled={pending}
            className="mt-3 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </form>
    </Section>
  );
}
