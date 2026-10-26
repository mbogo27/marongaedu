"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/dal";
import { deleteSession, revokeUserSessions, verifySessionId } from "@/lib/session";
import { formatRetry, getRateLimiter } from "@/lib/rate-limit";
import { isCommonPassword, verifyPassword } from "@/lib/auth/password";
import { getCredentialAccount, isLastActiveAdmin, setPassword } from "@/lib/auth/users";
import { issueToken } from "@/lib/auth/verification";
import { DEFAULT_PREFS } from "@/lib/email/send";
import { sendEmail } from "@/lib/email/send";
import { anonymiseUser } from "@/lib/auth/anonymise";
import { getStorage, newKey, uploadLimits } from "@/lib/storage";
import { checkUpload, sniffMatches } from "@/lib/storage/policy";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { t } from "@/lib/i18n";

export type AccountFormState = { error?: string; success?: string; fieldErrors?: Record<string, string[]> } | undefined;

const AVATAR_MAX_MB = 5;

export async function updateProfileAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) return { fieldErrors: { name: [t("auth.name_min")] } };
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 1000) || null;

  let avatarUrl: string | undefined;
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const check = checkUpload("image", file.type, file.size, { ...uploadLimits(), fileMb: AVATAR_MAX_MB });
    if (!check.ok) return { fieldErrors: { avatar: [check.error] } };
    const body = Buffer.from(await file.arrayBuffer());
    if (!sniffMatches(file.type, body.subarray(0, 16))) {
      return { fieldErrors: { avatar: ["That file doesn't look like a valid image."] } };
    }
    const storage = getStorage();
    const key = newKey("public", "avatars", check.ext);
    await storage.putObject(key, body, file.type);
    avatarUrl = storage.publicUrl(key);
  }

  await db.user.update({ where: { id: user.id }, data: { name, bio, ...(avatarUrl ? { avatarUrl } : {}) } });
  revalidatePath("/", "layout");
  return { success: t("account.saved") };
}

export async function changePasswordAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = passwordSchema.safeParse(formData.get("newPassword"));
  if (!next.success) return { fieldErrors: { newPassword: [next.error.issues[0].message] } };
  if (next.data !== String(formData.get("confirmPassword") ?? "")) {
    return { fieldErrors: { confirmPassword: [t("auth.password_mismatch")] } };
  }
  if (isCommonPassword(next.data)) return { fieldErrors: { newPassword: [t("auth.password_common")] } };

  const account = await getCredentialAccount(user.id);
  if (account?.passwordHash) {
    // Guard the current-password check against guessing from a hijacked session.
    const rl = await getRateLimiter().peek(`pwchange:${user.id}`, 4, 15 * 60);
    if (rl.blocked) return { error: t("auth.too_many_attempts", { wait: formatRetry(rl.retryAfterSec) }) };
    if (!(await verifyPassword(current, account.passwordHash))) {
      await getRateLimiter().consume(`pwchange:${user.id}`, 4, 15 * 60);
      return { fieldErrors: { currentPassword: [t("auth.current_password_wrong")] } };
    }
  }

  await setPassword(user.id, next.data);
  const current_ = await verifySessionId();
  await revokeUserSessions(user.id, current_ ?? undefined);
  await audit({ actorId: user.id, action: account?.passwordHash ? "auth.password_changed" : "auth.password_set", targetType: "user", targetId: user.id });
  await sendEmail("passwordChanged", user.email, { name: user.name }, { link: "/forgot-password", userId: user.id });
  return { success: t("account.password_changed") };
}

export async function changeEmailAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = emailSchema.safeParse(formData.get("newEmail"));
  if (!parsed.success) return { fieldErrors: { newEmail: [t("auth.email_invalid")] } };
  const newEmail = parsed.data;
  if (newEmail === user.email) return { fieldErrors: { newEmail: ["That's already your email address."] } };

  const account = await getCredentialAccount(user.id);
  if (account?.passwordHash) {
    const rl = await getRateLimiter().peek(`pwchange:${user.id}`, 4, 15 * 60);
    if (rl.blocked) return { error: t("auth.too_many_attempts", { wait: formatRetry(rl.retryAfterSec) }) };
    if (!(await verifyPassword(String(formData.get("currentPassword") ?? ""), account.passwordHash))) {
      await getRateLimiter().consume(`pwchange:${user.id}`, 4, 15 * 60);
      return { fieldErrors: { currentPassword: [t("auth.current_password_wrong")] } };
    }
  }

  const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  // Same message whether or not the address is taken (no enumeration); we just don't send.
  if (!taken) {
    const token = await issueToken({ purpose: "CHANGE_EMAIL", identifier: newEmail, userId: user.id, meta: { newEmail } });
    await sendEmail("emailChangeConfirm", newEmail, { name: user.name, email: newEmail }, { link: `/account/confirm-email?token=${token}` });
    await sendEmail("emailChangeNotice", user.email, { name: user.name, email: newEmail }, { userId: user.id });
    await audit({ actorId: user.id, action: "auth.email_change_requested", targetType: "user", targetId: user.id });
  }
  return { success: t("account.email_change_sent", { email: newEmail }) };
}

export async function updateNotificationPrefsAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const prefs = {
    ...DEFAULT_PREFS,
    courseUpdates: formData.get("courseUpdates") === "on",
    certificates: formData.get("certificates") === "on",
    marketing: formData.get("marketing") === "on",
  };
  await db.user.update({ where: { id: user.id }, data: { notificationPrefs: prefs } });
  revalidatePath("/account");
  return { success: t("account.saved") };
}

export async function revokeSessionAction(sessionId: string) {
  const user = await requireUser();
  await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
  await audit({ actorId: user.id, action: "auth.session_revoked", targetType: "session", targetId: sessionId });
  revalidatePath("/account");
}

export async function revokeOtherSessionsAction() {
  const user = await requireUser();
  const current = await verifySessionId();
  await revokeUserSessions(user.id, current ?? undefined);
  await audit({ actorId: user.id, action: "auth.sessions_revoked_all", targetType: "user", targetId: user.id });
  revalidatePath("/account");
}

export async function deleteAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { fieldErrors: { confirm: [t("auth.delete_confirm_mismatch")] } };
  }

  const account = await getCredentialAccount(user.id);
  if (account?.passwordHash) {
    if (!(await verifyPassword(String(formData.get("currentPassword") ?? ""), account.passwordHash))) {
      return { fieldErrors: { currentPassword: [t("auth.current_password_wrong")] } };
    }
  } else if (String(formData.get("confirmEmail") ?? "").trim().toLowerCase() !== user.email) {
    // No password on file (OAuth-only): fall back to typing the account email.
    return { fieldErrors: { confirmEmail: ["Type your account email to confirm."] } };
  }
  if (await isLastActiveAdmin(user.id)) return { error: t("auth.last_admin") };

  await anonymiseUser(user.id);
  await audit({ actorId: user.id, action: "account.deleted", targetType: "user", targetId: user.id });
  await deleteSession();
  redirect("/?deleted=1");
}
