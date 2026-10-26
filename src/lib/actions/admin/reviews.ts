"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";

async function setStatus(reviewId: string, status: "PUBLISHED" | "HIDDEN" | "FLAGGED", action: string) {
  const admin = await requireAdmin();
  const review = await db.review.update({ where: { id: reviewId }, data: { status }, include: { course: { select: { slug: true } } } });
  await audit({ actorId: admin.id, action, targetType: "review", targetId: reviewId });
  revalidatePath("/admin/reviews");
  revalidatePath(`/courses/${review.course.slug}`);
}

export async function hideReviewAction(reviewId: string) {
  await setStatus(reviewId, "HIDDEN", "review.hide");
}
export async function unhideReviewAction(reviewId: string) {
  await setStatus(reviewId, "PUBLISHED", "review.unhide");
}
export async function flagReviewAction(reviewId: string) {
  await setStatus(reviewId, "FLAGGED", "review.flag");
}

/** Soft delete (spec §5: reviews are soft-deleted). The author may write a fresh one. */
export async function deleteReviewAction(reviewId: string) {
  const admin = await requireAdmin();
  const review = await db.review.update({ where: { id: reviewId }, data: { deletedAt: new Date() }, include: { course: { select: { slug: true } } } });
  await audit({ actorId: admin.id, action: "review.delete", targetType: "review", targetId: reviewId });
  revalidatePath("/admin/reviews");
  revalidatePath(`/courses/${review.course.slug}`);
}

export async function replyToReviewAction(reviewId: string, formData: FormData) {
  const admin = await requireAdmin();
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 2000);
  const review = await db.review.update({
    where: { id: reviewId },
    data: { instructorReply: reply || null, repliedAt: reply ? new Date() : null },
    include: { course: { select: { slug: true } } },
  });
  await audit({ actorId: admin.id, action: "review.reply", targetType: "review", targetId: reviewId });
  revalidatePath("/admin/reviews");
  revalidatePath(`/courses/${review.course.slug}`);
}
