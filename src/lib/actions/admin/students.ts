"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { revokeUserSessions } from "@/lib/session";
import { anonymiseUser } from "@/lib/auth/anonymise";
import { issueToken } from "@/lib/auth/verification";
import { sendEmail } from "@/lib/email/send";
import { revokeEnrollment, upsertEnrollment } from "@/lib/enrollment";

type Result = { ok: boolean; error?: string };

/** Admin accounts are managed from Settings → Team (last-admin and self-protection rules live there). */
async function learnerOrError(userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) return { error: "User not found." as const };
  if (user.role === "ADMIN") return { error: "Admins are managed under Settings → Team." as const };
  return { user };
}

export async function suspendStudentAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const t = await learnerOrError(userId);
  if ("error" in t) return { ok: false, error: t.error };
  await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await revokeUserSessions(userId); // existing sessions are revoked immediately (spec §2)
  await audit({ actorId: admin.id, action: "user.suspend", targetType: "user", targetId: userId });
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${userId}`);
  return { ok: true };
}

export async function unsuspendStudentAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const t = await learnerOrError(userId);
  if ("error" in t) return { ok: false, error: t.error };
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await audit({ actorId: admin.id, action: "user.unsuspend", targetType: "user", targetId: userId });
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${userId}`);
  return { ok: true };
}

export async function deleteStudentAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const t = await learnerOrError(userId);
  if ("error" in t) return { ok: false, error: t.error };
  await anonymiseUser(userId);
  await audit({ actorId: admin.id, action: "user.delete", targetType: "user", targetId: userId });
  revalidatePath("/admin/students");
  return { ok: true };
}

export async function resendVerificationForAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const t = await learnerOrError(userId);
  if ("error" in t) return { ok: false, error: t.error };
  if (t.user.emailVerifiedAt) return { ok: false, error: "Already verified." };
  const token = await issueToken({ purpose: "VERIFY_EMAIL", identifier: t.user.email, userId });
  await sendEmail("verifyEmail", t.user.email, { name: t.user.name }, { link: `/verify-email?token=${token}`, userId });
  await audit({ actorId: admin.id, action: "user.resend_verification", targetType: "user", targetId: userId });
  return { ok: true };
}

export async function sendPasswordResetForAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const t = await learnerOrError(userId);
  if ("error" in t) return { ok: false, error: t.error };
  const token = await issueToken({ purpose: "RESET_PASSWORD", identifier: t.user.email, userId });
  await sendEmail("passwordReset", t.user.email, { name: t.user.name }, { link: `/reset-password?token=${token}`, userId });
  await audit({ actorId: admin.id, action: "user.send_password_reset", targetType: "user", targetId: userId });
  return { ok: true };
}

export async function revokeAccessAction(enrollmentId: string): Promise<Result> {
  const admin = await requireAdmin();
  const e = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) return { ok: false, error: "Enrollment not found." };
  await db.$transaction((tx) => revokeEnrollment(tx, enrollmentId));
  await audit({ actorId: admin.id, action: "enrollment.revoke", targetType: "enrollment", targetId: enrollmentId, meta: { userId: e.userId, courseId: e.courseId } });
  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/students/${e.userId}`);
  return { ok: true };
}

export async function restoreAccessAction(enrollmentId: string): Promise<Result> {
  const admin = await requireAdmin();
  const e = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) return { ok: false, error: "Enrollment not found." };
  await db.$transaction((tx) => upsertEnrollment(tx, { userId: e.userId, courseId: e.courseId, source: e.source }));
  await audit({ actorId: admin.id, action: "enrollment.restore", targetType: "enrollment", targetId: enrollmentId });
  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/students/${e.userId}`);
  return { ok: true };
}

export async function addStudentNoteAction(studentId: string, formData: FormData) {
  const admin = await requireAdmin();
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!text) return;
  await db.studentNote.create({ data: { studentId, authorId: admin.id, text } });
  await audit({ actorId: admin.id, action: "user.note_added", targetType: "user", targetId: studentId });
  revalidatePath(`/admin/students/${studentId}`);
}
