"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSession, deleteSession, revokeUserSessions } from "@/lib/session";
import { getCurrentUser } from "@/lib/dal";
import { getClientIp, safeRedirect } from "@/lib/request";
import { formatRetry, getRateLimiter } from "@/lib/rate-limit";
import { DUMMY_HASH, hashPassword, isCommonPassword, verifyPassword } from "@/lib/auth/password";
import { createCredentialUser, getCredentialAccount, setPassword } from "@/lib/auth/users";
import { consumeToken, issueToken } from "@/lib/auth/verification";
import { sendEmail } from "@/lib/email/send";
import { notify } from "@/lib/notify";
import { verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors, loginSchema, resetPasswordSchema, signupSchema, emailSchema } from "@/lib/validation";
import { t } from "@/lib/i18n";

export type AuthFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; message?: string }
  | undefined;

const MIN = 60;
const HOUR = 3600;

// Spec §3.7: 5 failed logins per email and 20 per IP per 15 min. `peek`/`consume`
// block when count > limit, so "5 failures allowed" means blocking at the 5th.
const LOGIN_EMAIL_MAX_FAILS = 5;
const LOGIN_IP_MAX_FAILS = 20;
const LOGIN_WINDOW = 15 * MIN;

/* ------------------------------------------------------------------ */
/* Sign up                                                             */
/* ------------------------------------------------------------------ */

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const ip = await getClientIp();
  const limiter = getRateLimiter();

  const rl = await limiter.consume(`signup:ip:${ip}`, 5, HOUR);
  if (rl.blocked) {
    await audit({ action: "auth.signup_blocked", meta: { ip } });
    return { error: t("auth.signup_rate_limited", { wait: formatRetry(rl.retryAfterSec) }) };
  }
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), ip))) {
    return { error: t("auth.captcha_failed") };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password } = parsed.data;
  if (isCommonPassword(password)) return { fieldErrors: { password: [t("auth.password_common")] } };

  // Hash in both branches so response time doesn't reveal whether the email exists.
  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, name: true, deletedAt: true } });

  if (existing && !existing.deletedAt) {
    // No enumeration: same outcome for the visitor; the real owner gets a notice instead.
    await sendEmail("signupExisting", email, { name: existing.name }, { link: "/login", userId: existing.id });
    await audit({ action: "auth.signup_existing_email", targetType: "user", targetId: existing.id });
  } else {
    const user = await createCredentialUser({ name, email, password, passwordHash });
    const token = await issueToken({ purpose: "VERIFY_EMAIL", identifier: email, userId: user.id });
    await notify("signup", { userId: user.id, name: user.name });
    await audit({ actorId: user.id, action: "auth.signup", targetType: "user", targetId: user.id });
    await sendEmail("verifyEmail", email, { name }, { link: `/verify-email?token=${token}`, userId: user.id });
  }

  const back = safeRedirect(formData.get("redirect"), "");
  redirect(`/signup/check-inbox${back ? `?redirect=${encodeURIComponent(back)}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* Sign in / out                                                       */
/* ------------------------------------------------------------------ */

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;

  const ip = await getClientIp();
  const limiter = getRateLimiter();
  const emailKey = `login:email:${email}`;
  const ipKey = `login:ip:${ip}`;

  const [byEmail, byIp] = await Promise.all([
    limiter.peek(emailKey, LOGIN_EMAIL_MAX_FAILS - 1, LOGIN_WINDOW),
    limiter.peek(ipKey, LOGIN_IP_MAX_FAILS - 1, LOGIN_WINDOW),
  ]);
  if (byEmail.blocked || byIp.blocked) {
    await audit({ action: "auth.login_blocked", meta: { email, ip } });
    const wait = formatRetry(Math.max(byEmail.retryAfterSec, byIp.retryAfterSec));
    return { error: t("auth.too_many_attempts", { wait }) };
  }

  const user = await db.user.findFirst({ where: { email, deletedAt: null } });
  const account = user ? await getCredentialAccount(user.id) : null;
  // Always run bcrypt, even for unknown emails, so timing doesn't reveal account existence.
  const valid = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);

  if (!user || !account?.passwordHash || !valid) {
    await Promise.all([
      limiter.consume(emailKey, LOGIN_EMAIL_MAX_FAILS - 1, LOGIN_WINDOW),
      limiter.consume(ipKey, LOGIN_IP_MAX_FAILS - 1, LOGIN_WINDOW),
    ]);
    await audit({ actorId: user?.id, action: "auth.login_failed", meta: { email, ip } });
    return { error: t("auth.invalid_credentials") };
  }

  if (user.status !== "ACTIVE") {
    await audit({ actorId: user.id, action: "auth.login_suspended", meta: { ip } });
    return { error: t("auth.account_unavailable") };
  }

  await limiter.reset(emailKey);
  await createSession(user.id, { remember: formData.get("remember") === "on" });
  await audit({ actorId: user.id, action: "auth.login", targetType: "user", targetId: user.id });

  redirect(safeRedirect(formData.get("redirect"), user.role === "ADMIN" ? "/admin" : "/dashboard"));
}

export async function logoutAction() {
  await deleteSession();
  redirect("/");
}

/* ------------------------------------------------------------------ */
/* Forgot / reset password                                             */
/* ------------------------------------------------------------------ */

export async function forgotPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const ip = await getClientIp();
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) return { fieldErrors: { email: [t("auth.email_invalid")] } };
  const email = parsedEmail.data;

  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), ip))) {
    return { error: t("auth.captcha_failed") };
  }

  // Spec §3.5: 3/hour per email, 10/hour per IP — keyed on the *input*, so limits
  // behave identically whether or not the account exists.
  const limiter = getRateLimiter();
  const [byEmail, byIp] = await Promise.all([
    limiter.consume(`forgot:email:${email}`, 3, HOUR),
    limiter.consume(`forgot:ip:${ip}`, 10, HOUR),
  ]);
  if (byEmail.blocked || byIp.blocked) {
    await audit({ action: "auth.reset_blocked", meta: { email, ip } });
    const wait = formatRetry(Math.max(byEmail.retryAfterSec, byIp.retryAfterSec));
    return { error: t("auth.too_many_attempts", { wait }) };
  }

  const user = await db.user.findFirst({ where: { email, deletedAt: null, status: "ACTIVE" } });
  if (user) {
    const token = await issueToken({ purpose: "RESET_PASSWORD", identifier: email, userId: user.id });
    await sendEmail("passwordReset", email, { name: user.name }, { link: `/reset-password?token=${token}`, userId: user.id });
    await audit({ actorId: user.id, action: "auth.reset_requested", targetType: "user", targetId: user.id });
  }
  // Same response either way.
  return { message: t("auth.reset_sent") };
}

export async function resetPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { token, password } = parsed.data;
  if (isCommonPassword(password)) return { fieldErrors: { password: [t("auth.password_common")] } };

  const consumed = await consumeToken(token, "RESET_PASSWORD");
  if (!consumed.ok || !consumed.token.userId) return { error: t("auth.reset_invalid") };

  const user = await db.user.findFirst({ where: { id: consumed.token.userId, deletedAt: null } });
  if (!user) return { error: t("auth.reset_invalid") };

  await setPassword(user.id, password);
  // A reset proves control of the inbox: they can now read this address.
  if (!user.emailVerifiedAt) {
    await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  }
  await revokeUserSessions(user.id);
  await getRateLimiter().reset(`login:email:${user.email}`);
  await audit({ actorId: user.id, action: "auth.password_reset", targetType: "user", targetId: user.id });
  await sendEmail("passwordChanged", user.email, { name: user.name }, { link: "/forgot-password", userId: user.id });

  redirect("/login?reset=success");
}

/* ------------------------------------------------------------------ */
/* Email verification                                                  */
/* ------------------------------------------------------------------ */

export async function resendVerificationAction(): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: t("auth.generic_error") };
  if (user.emailVerifiedAt) return { ok: true, message: t("auth.verify_sent") };

  // Spec §3.3: max 3 per hour per user.
  const rl = await getRateLimiter().consume(`verify:user:${user.id}`, 3, HOUR);
  if (rl.blocked) return { ok: false, message: t("auth.verify_rate_limited", { wait: formatRetry(rl.retryAfterSec) }) };

  const token = await issueToken({ purpose: "VERIFY_EMAIL", identifier: user.email, userId: user.id });
  await sendEmail("verifyEmail", user.email, { name: user.name }, { link: `/verify-email?token=${token}`, userId: user.id });
  return { ok: true, message: t("auth.verify_sent") };
}

