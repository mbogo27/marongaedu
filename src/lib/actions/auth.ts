"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { signupSchema, loginSchema } from "@/lib/validation";
import { notify, sendStubEmail } from "@/lib/notify";

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = nanoid(24);
  const user = await db.user.create({
    data: { name, email, passwordHash, role: "LEARNER", verifyToken },
  });

  await notify("signup", { userId: user.id, name: user.name });
  await sendStubEmail(
    email,
    "Verify your email — Maronga Dental Academy",
    `Hi ${name}, click to verify: /verify-email?token=${verifyToken}`
  );

  await createSession(user.id, "LEARNER");
  const redirectTo = String(formData.get("redirect") || "/dashboard");
  redirect(redirectTo);
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { email, password } = parsed.data;

  const user = await db.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) return { error: "Invalid email or password." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Invalid email or password." };

  const remember = formData.get("remember") === "on";
  await createSession(user.id, user.role, remember ? 30 : 7);
  const redirectTo = String(formData.get("redirect") || (user.role === "ADMIN" ? "/admin" : "/dashboard"));
  redirect(redirectTo);
}

export async function adminLoginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { email, password } = parsed.data;

  const user = await db.user.findFirst({ where: { email, deletedAt: null, role: "ADMIN" } });
  if (!user) return { error: "Invalid admin credentials." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Invalid admin credentials." };

  await createSession(user.id, "ADMIN");
  redirect("/admin");
}

/** Stub Google OAuth: creates/logs-in a mock Google-sourced account, no real provider call. */
export async function googleStubAction(formData: FormData) {
  const redirectTo = String(formData.get("redirect") || "/dashboard");
  const email = "google.demo@example.com";

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        name: "Google Demo User",
        email,
        passwordHash: await bcrypt.hash(nanoid(20), 10),
        role: "LEARNER",
        isGoogleStub: true,
        verifiedAt: new Date(),
        avatarUrl: "https://picsum.photos/seed/google-demo/200/200",
      },
    });
    await notify("signup", { userId: user.id, name: user.name, via: "google-stub" });
  }

  await createSession(user.id, user.role);
  redirect(redirectTo);
}

export async function logoutAction() {
  await deleteSession();
  redirect("/");
}

export async function adminLogoutAction() {
  await deleteSession();
  redirect("/admin/login");
}

export async function forgotPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") || "").trim();
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const resetToken = nanoid(24);
    await db.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendStubEmail(
      email,
      "Reset your password — Maronga Dental Academy",
      `Hi ${user.name}, reset your password here: /reset-password?token=${resetToken}`
    );
  }
  // Always the same message, whether or not the email exists.
  return { error: undefined };
}

export async function resetPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const user = await db.user.findFirst({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  redirect("/login?reset=success");
}

export async function verifyEmailAction(token: string) {
  const user = await db.user.findFirst({ where: { verifyToken: token } });
  if (!user) return false;
  await db.user.update({ where: { id: user.id }, data: { verifiedAt: new Date(), verifyToken: null } });
  return true;
}

export async function resendVerificationAction() {
  const { getCurrentUser } = await import("@/lib/dal");
  const user = await getCurrentUser();
  if (!user || user.verifiedAt) return;
  const verifyToken = nanoid(24);
  await db.user.update({ where: { id: user.id }, data: { verifyToken } });
  await sendStubEmail(user.email, "Verify your email", `Click to verify: /verify-email?token=${verifyToken}`);
}
