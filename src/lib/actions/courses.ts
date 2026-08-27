"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, getCurrentUser } from "@/lib/dal";
import { notify } from "@/lib/notify";
import { reviewSchema } from "@/lib/validation";

/** Guests are redirected to login; free courses enroll immediately; paid courses go to checkout. */
export async function enrollAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=/courses/${slug}`);
  }

  const course = await db.course.findUnique({ where: { slug } });
  if (!course) redirect("/courses");

  if (!course!.isFree) {
    redirect(`/checkout/${slug}`);
  }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user!.id, courseId: course!.id } },
  });
  if (!existing) {
    const enrollment = await db.enrollment.create({
      data: { userId: user!.id, courseId: course!.id, source: "FREE" },
    });
    await db.payment.create({
      data: { userId: user!.id, courseId: course!.id, enrollmentId: enrollment.id, amountKes: 0, method: "FREE", status: "SUCCESS" },
    });
    await notify("enrollment", { userId: user!.id, courseId: course!.id, course: course!.title });
  }

  redirect(`/learn/${slug}`);
}

export async function toggleWishlistAction(courseId: string) {
  const user = await requireUser();
  const existing = await db.wishlist.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (existing) {
    await db.wishlist.delete({ where: { userId_courseId: { userId: user.id, courseId } } });
  } else {
    await db.wishlist.create({ data: { userId: user.id, courseId } });
  }
  revalidatePath("/dashboard");
}

export async function submitReviewAction(courseId: string, slug: string, formData: FormData) {
  const user = await requireUser();

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (!enrollment) return { error: "You must be enrolled to review this course." };

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    text: formData.get("text"),
  });
  if (!parsed.success) return { error: "Please provide a rating and a short review." };

  await db.review.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: { rating: parsed.data.rating, text: parsed.data.text },
    create: { userId: user.id, courseId, rating: parsed.data.rating, text: parsed.data.text },
  });

  await notify("review", { userId: user.id, courseId, rating: parsed.data.rating });
  revalidatePath(`/courses/${slug}`);
  return { success: true };
}

export async function subscribeNewsletterAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };

  await db.subscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
  return { success: true };
}

export async function submitContactAction(_prev: unknown, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name || !email || !subject || message.length < 10) {
    return { error: "Please fill in all fields — message must be at least 10 characters." };
  }

  await db.contactSubmission.create({ data: { name, email, subject, message } });
  await notify("contact_submission", { name, email, subject });
  return { success: true };
}
