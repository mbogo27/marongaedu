"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/dal";
import { effectivePrice } from "@/lib/domain/pricing";
import { enrollInCourse } from "@/lib/enrollment";
import { getLessonView, type LessonBody } from "@/lib/lesson-access";
import { getRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { issueToken } from "@/lib/auth/verification";
import { sendAdminEmail, sendEmail } from "@/lib/email/send";
import { getSetting } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { contactSchema, emailSchema, fieldErrors, reviewSchema } from "@/lib/validation";
import { t } from "@/lib/i18n";

/** Guests → login; free → enroll now; paid → checkout. All eligibility is re-checked server-side. */
export async function enrollAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/courses/${slug}`)}`);

  const course = await db.course.findFirst({ where: { slug, status: "PUBLISHED", deletedAt: null } });
  if (!course) redirect("/courses");
  track("enroll_clicked", { slug });

  if (effectivePrice(course) > 0) redirect(`/checkout/${slug}`);

  const result = await enrollInCourse({ userId: user.id, courseId: course.id, source: "FREE" });
  if (!result.ok) redirect(`/courses/${slug}?enrollError=${encodeURIComponent(result.error)}`);

  await notify("enrollment", { userId: user.id, courseId: course.id, course: course.title });
  await sendEmail(
    "enrollmentConfirmation",
    user.email,
    { name: user.name, course: course.title, receipt: "" },
    { link: `/learn/${course.slug}`, userId: user.id }
  );
  const notifySettings = await getSetting("notifications");
  if (notifySettings.adminNewEnrollment) {
    await sendAdminEmail("adminNewEnrollment", { name: user.name, email: user.email, course: course.title, amount: "Free" }, "/admin/enrollments");
  }
  redirect(`/learn/${slug}?enrolled=success`);
}

export async function toggleWishlistAction(courseId: string) {
  const user = await requireUser();
  const where = { userId_courseId: { userId: user.id, courseId } };
  const existing = await db.wishlist.findUnique({ where });
  if (existing) await db.wishlist.delete({ where });
  else await db.wishlist.create({ data: { userId: user.id, courseId } });
  revalidatePath("/dashboard");
  revalidatePath("/courses/[slug]", "page");
}

/** Fetch a free-preview lesson body for the curriculum "Preview" modal — guests allowed, nothing else is. */
export async function previewLessonAction(lessonId: string): Promise<LessonBody | null> {
  const user = await getCurrentUser();
  const view = await getLessonView(user, lessonId);
  if (!view.ok || !view.lesson.isFreePreview) return null;
  return view.body;
}

/* ---------------- reviews ---------------- */

export type ReviewResult = { success?: true; error?: string };

export async function submitReviewAction(courseId: string, slug: string, formData: FormData): Promise<ReviewResult> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) return { error: t("review.verify_first") };

  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (!enrollment || enrollment.status !== "ACTIVE") return { error: t("review.enroll_first") };

  const { minProgressPercent } = await getSetting("reviews");
  if (enrollment.progressPercent < minProgressPercent) {
    return { error: t("review.progress_required", { percent: minProgressPercent }) };
  }

  const parsed = reviewSchema.safeParse({ rating: formData.get("rating"), text: formData.get("text") });
  if (!parsed.success) return { error: t("review.invalid") };

  const existing = await db.review.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  // Authors can edit their own review; a hidden/flagged one stays so after an edit.
  const review = await db.review.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: { rating: parsed.data.rating, text: parsed.data.text, deletedAt: null },
    create: { userId: user.id, courseId, rating: parsed.data.rating, text: parsed.data.text },
    include: { course: { select: { title: true } } },
  });

  if (!existing) {
    await notify("review", { userId: user.id, courseId, rating: parsed.data.rating });
    const notifySettings = await getSetting("notifications");
    if (notifySettings.adminNewReview) {
      await sendAdminEmail(
        "adminNewReview",
        { name: user.name, course: review.course.title, rating: parsed.data.rating, message: parsed.data.text },
        "/admin/reviews"
      );
    }
  }
  revalidatePath(`/courses/${slug}`);
  return { success: true };
}

/** One helpful/unhelpful vote per user per review; repeating the same vote removes it. */
export async function voteReviewAction(reviewId: string, helpful: boolean, slug: string) {
  const user = await requireUser();
  const review = await db.review.findFirst({ where: { id: reviewId, status: "PUBLISHED", deletedAt: null } });
  if (!review || review.userId === user.id) return;

  const where = { reviewId_userId: { reviewId, userId: user.id } };
  const existing = await db.reviewVote.findUnique({ where });
  if (existing?.helpful === helpful) await db.reviewVote.delete({ where });
  else await db.reviewVote.upsert({ where, update: { helpful }, create: { reviewId, userId: user.id, helpful } });
  revalidatePath(`/courses/${slug}`);
}

/* ---------------- newsletter + contact ---------------- */

export type SimpleFormState = { success?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function subscribeNewsletterAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const ip = await getClientIp();
  const rl = await getRateLimiter().consume(`newsletter:ip:${ip}`, 5, 3600);
  if (rl.blocked) return { error: t("auth.too_many_attempts", { wait: "an hour" }) };

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: t("auth.email_invalid") };
  const email = parsed.data;

  const { doubleOptIn } = await getSetting("newsletter");
  const sub = await db.subscriber.upsert({
    where: { email },
    update: { unsubscribedAt: null },
    create: { email, confirmedAt: doubleOptIn ? null : new Date() },
  });

  if (doubleOptIn && !sub.confirmedAt) {
    const token = await issueToken({ purpose: "NEWSLETTER_OPTIN", identifier: email, meta: { subscriberId: sub.id } });
    await sendEmail("newsletterOptin", email, {}, { link: `/newsletter/confirm?token=${token}` });
  }
  // Same message whether or not they were already subscribed.
  return { success: true, message: doubleOptIn ? "Check your inbox to confirm your subscription." : "You're subscribed. Thank you!" };
}

export async function submitContactAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const ip = await getClientIp();
  const rl = await getRateLimiter().consume(`contact:ip:${ip}`, 5, 3600);
  if (rl.blocked) return { error: t("auth.too_many_attempts", { wait: "an hour" }) };

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { name, email, subject, message } = parsed.data;
  await db.contactSubmission.create({ data: { name, email, subject, message } });
  await notify("contact_submission", { name, email, subject });
  await sendAdminEmail("contactMessage", { fromName: name, fromEmail: email, subject, message }, "/admin/messages");
  return { success: true, message: "Thanks! We'll get back to you soon." };
}

