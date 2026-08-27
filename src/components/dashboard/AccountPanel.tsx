"use client";

import { useActionState, useState } from "react";
import {
  updateProfileAction,
  changePasswordAction,
  updateNotificationPrefsAction,
  deleteAccountAction,
  type AccountFormState,
} from "@/lib/actions/account";

export default function AccountPanel({
  name,
  bio,
  notifyEmail,
  notifyMarketing,
}: {
  name: string;
  bio: string | null;
  notifyEmail: boolean;
  notifyMarketing: boolean;
}) {
  const [profileState, profileAction, profilePending] = useActionState<AccountFormState, FormData>(updateProfileAction, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState<AccountFormState, FormData>(changePasswordAction, undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-6">
      <form action={profileAction} className="rounded-2xl border border-teal-100 bg-white p-6">
        <h3 className="font-serif text-lg text-teal-900">Profile</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-ink/70">
              Full name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={name}
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="bio" className="text-sm font-medium text-ink/70">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={bio ?? ""}
              rows={3}
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="avatar" className="text-sm font-medium text-ink/70">
              Profile photo
            </label>
            <input id="avatar" name="avatar" type="file" accept="image/*" className="mt-1 text-sm" />
          </div>
        </div>
        {profileState?.error && <p className="mt-2 text-sm text-red-600">{profileState.error}</p>}
        {profileState?.success && <p className="mt-2 text-sm text-teal-700">Saved.</p>}
        <button
          type="submit"
          disabled={profilePending}
          className="mt-4 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {profilePending ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form action={passwordAction} className="rounded-2xl border border-teal-100 bg-white p-6">
        <h3 className="font-serif text-lg text-teal-900">Change password</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="currentPassword" className="text-sm font-medium text-ink/70">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="text-sm font-medium text-ink/70">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
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
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
        </div>
        {passwordState?.error && <p className="mt-2 text-sm text-red-600">{passwordState.error}</p>}
        {passwordState?.success && <p className="mt-2 text-sm text-teal-700">Password updated.</p>}
        <button
          type="submit"
          disabled={passwordPending}
          className="mt-4 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {passwordPending ? "Saving…" : "Update password"}
        </button>
      </form>

      <form action={updateNotificationPrefsAction} className="rounded-2xl border border-teal-100 bg-white p-6">
        <h3 className="font-serif text-lg text-teal-900">Notification preferences</h3>
        <div className="mt-4 space-y-2 text-sm text-ink/80">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyEmail" defaultChecked={notifyEmail} className="h-4 w-4 rounded border-teal-300 text-teal-600" />
            Email me about my course progress
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyMarketing" defaultChecked={notifyMarketing} className="h-4 w-4 rounded border-teal-300 text-teal-600" />
            Send me new course announcements
          </label>
        </div>
        <button type="submit" className="mt-4 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Save preferences
        </button>
      </form>

      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
        <h3 className="font-serif text-lg text-red-700">Delete account</h3>
        <p className="mt-1 text-sm text-red-600/80">This deactivates your account. This action cannot be undone from the UI.</p>
        {confirmDelete ? (
          <div className="mt-4 flex gap-3">
            <form action={deleteAccountAction}>
              <button type="submit" className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Yes, delete my account
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Delete my account
          </button>
        )}
      </div>
    </div>
  );
}
