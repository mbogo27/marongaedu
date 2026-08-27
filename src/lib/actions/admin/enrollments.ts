"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { notify } from "@/lib/notify";

export async function manualEnrollAction(_prev: { error?: string } | undefined, formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim();
  const courseId = String(formData.get("courseId") || "");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No user found with that email." };

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Course not found." };

  const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (existing) return { error: "This student is already enrolled." };

  const enrollment = await db.enrollment.create({ data: { userId: user.id, courseId, source: "MANUAL" } });
  await db.payment.create({ data: { userId: user.id, courseId, enrollmentId: enrollment.id, amountKes: 0, method: "MANUAL", status: "SUCCESS" } });
  await notify("enrollment", { userId: user.id, courseId, course: course.title, manual: true });

  revalidatePath("/admin/enrollments");
  return { error: undefined };
}
