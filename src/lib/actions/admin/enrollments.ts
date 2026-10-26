"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { enrollInCourse } from "@/lib/enrollment";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email/send";
import { emailSchema } from "@/lib/validation";

export type ManualEnrollState = { error?: string; success?: string } | undefined;

/** Comp / support enrollment: grants access without payment and bypasses the cap and window. */
export async function manualEnrollAction(_prev: ManualEnrollState, formData: FormData): Promise<ManualEnrollState> {
  const admin = await requireAdmin();
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };

  const user = await db.user.findFirst({ where: { email: parsed.data, deletedAt: null } });
  if (!user) return { error: "No user found with that email." };
  if (user.status !== "ACTIVE") return { error: "That account is suspended." };

  const courseId = String(formData.get("courseId") ?? "");
  const course = await db.course.findFirst({ where: { id: courseId, deletedAt: null } });
  if (!course) return { error: "Course not found." };

  const result = await enrollInCourse({ userId: user.id, courseId, source: "MANUAL", bypassGate: true, actorId: admin.id });
  if (!result.ok) return { error: result.error };

  await notify("enrollment", { userId: user.id, courseId, course: course.title, manual: true });
  await sendEmail("enrollmentConfirmation", user.email, { name: user.name, course: course.title, receipt: "" }, { link: `/learn/${course.slug}`, userId: user.id });
  revalidatePath("/admin/enrollments");
  return { success: `${user.name} is now enrolled in ${course.title}.` };
}
