"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export async function hideReviewAction(reviewId: string) {
  await requireAdmin();
  await db.review.update({ where: { id: reviewId }, data: { status: "HIDDEN" } });
  revalidatePath("/admin/reviews");
}

export async function unhideReviewAction(reviewId: string) {
  await requireAdmin();
  await db.review.update({ where: { id: reviewId }, data: { status: "PUBLISHED" } });
  revalidatePath("/admin/reviews");
}

export async function deleteReviewAction(reviewId: string) {
  await requireAdmin();
  await db.review.delete({ where: { id: reviewId } }).catch(() => {});
  revalidatePath("/admin/reviews");
}

export async function replyToReviewAction(reviewId: string, formData: FormData) {
  await requireAdmin();
  const reply = String(formData.get("reply") || "").trim();
  await db.review.update({ where: { id: reviewId }, data: { instructorReply: reply || null } });
  revalidatePath("/admin/reviews");
}
