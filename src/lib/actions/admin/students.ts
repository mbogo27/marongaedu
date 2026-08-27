"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export async function suspendStudentAction(userId: string) {
  await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } });
  revalidatePath("/admin/students");
}

export async function unsuspendStudentAction(userId: string) {
  await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { suspendedAt: null } });
  revalidatePath("/admin/students");
}

export async function deleteStudentAction(userId: string) {
  await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/students");
}

export async function addStudentNoteAction(studentId: string, formData: FormData) {
  const admin = await requireAdmin();
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await db.studentNote.create({ data: { studentId, authorId: admin.id, text } });
  await db.activityLog.create({ data: { userId: studentId, action: "admin_note_added" } });
  revalidatePath(`/admin/students/${studentId}`);
}
