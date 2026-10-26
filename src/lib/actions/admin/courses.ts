"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { createPresignedUpload, getStorage, UPLOAD_TARGETS, type UploadTarget } from "@/lib/storage";
import { coursePayloadSchema, type CoursePayload } from "@/lib/course-schema";
import { saveCourse, type SaveIntent, type SaveOutcome } from "@/lib/admin/course-service";
import { duplicateCourse, setCourseStatus } from "@/lib/admin/course-ops";

/** Autosave / save / publish / unpublish from the editor. Returns a result (no redirect) so the page keeps its state. */
export async function saveCourseAction(courseId: string | null, payload: CoursePayload, intent: SaveIntent): Promise<SaveOutcome> {
  const admin = await requireAdmin();
  const parsed = coursePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `${first.path.join(" › ") || "Form"}: ${first.message}` };
  }
  const outcome = await saveCourse(admin.id, courseId, parsed.data, intent);
  if (outcome.ok) {
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    revalidatePath(`/courses/${outcome.course.slug}`);
    revalidatePath("/");
  }
  return outcome;
}

export type UploadRequest =
  | { ok: true; key: string; url: string; upload: { url: string; method: "PUT"; headers: Record<string, string> } }
  | { ok: false; error: string };

/**
 * Mint a direct-to-storage upload (spec §6): MIME + size are validated here,
 * then the browser PUTs the bytes straight to the bucket. Large videos never
 * pass through the Next.js server (local dev uses an equivalent signed route).
 */
export async function requestUploadAction(target: UploadTarget, filename: string, contentType: string, size: number): Promise<UploadRequest> {
  await requireAdmin();
  if (!(target in UPLOAD_TARGETS)) return { ok: false, error: "Unknown upload target." };
  const res = await createPresignedUpload(target, filename, contentType, size);
  if (!res.ok) return res;
  const storage = getStorage();
  return { ok: true, key: res.key, upload: res.upload, url: res.key.startsWith("public/") ? storage.publicUrl(res.key) : "" };
}

export async function duplicateCourseAction(courseId: string) {
  const admin = await requireAdmin();
  await duplicateCourse(admin.id, courseId);
  revalidatePath("/admin/courses");
}

export async function setCourseStatusAction(courseId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const admin = await requireAdmin();
  const res = await setCourseStatus(admin.id, courseId, status);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  return res;
}

export async function deleteCourseAction(courseId: string) {
  const admin = await requireAdmin();
  // Soft delete: enrollments, payments and certificates keep their references.
  await db.course.update({ where: { id: courseId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit({ actorId: admin.id, action: "course.delete", targetType: "course", targetId: courseId });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}
