"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { notify } from "@/lib/notify";
import { simulateMpesa, simulateCard, isValidLuhn, isValidExpiry, isValidMpesaPhone } from "@/lib/payments";

export type CouponResult =
  | { valid: true; code: string; discountType: "PERCENT" | "FIXED"; discountValue: number; discountKes: number; totalKes: number }
  | { valid: false; error: string };

export async function applyCouponAction(courseId: string, priceKes: number, code: string): Promise<CouponResult> {
  const user = await requireUser();
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() }, include: { courses: true } });
  if (!coupon || !coupon.isActive) return { valid: false, error: "Coupon not found or inactive." };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { valid: false, error: "This coupon isn't active yet." };
  if (coupon.endsAt && coupon.endsAt < now) return { valid: false, error: "This coupon has expired." };

  if (coupon.courses.length > 0 && !coupon.courses.some((c) => c.courseId === courseId)) {
    return { valid: false, error: "This coupon doesn't apply to this course." };
  }

  if (coupon.usageLimit != null) {
    const totalUses = await db.couponUsage.count({ where: { couponId: coupon.id } });
    if (totalUses >= coupon.usageLimit) return { valid: false, error: "This coupon has reached its usage limit." };
  }
  if (coupon.perUserLimit != null) {
    const userUses = await db.couponUsage.count({ where: { couponId: coupon.id, userId: user.id } });
    if (userUses >= coupon.perUserLimit) return { valid: false, error: "You've already used this coupon." };
  }

  const discountKes =
    coupon.discountType === "PERCENT" ? Math.round((priceKes * coupon.discountValue) / 100) : coupon.discountValue;
  const totalKes = Math.max(0, priceKes - discountKes);

  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountKes,
    totalKes,
  };
}

async function finalizeEnrollment(userId: string, courseId: string, paymentId: string, source: "PURCHASE" | "COUPON") {
  const enrollment = await db.enrollment.create({
    data: { userId, courseId, source },
  });
  await db.payment.update({ where: { id: paymentId }, data: { enrollmentId: enrollment.id } });
  return enrollment;
}

export type PaymentAttemptResult =
  | { status: "success"; slug: string }
  | { status: "failed"; message: string }
  | { status: "pending"; paymentId: string };

export async function attemptMpesaPaymentAction(
  slug: string,
  phone: string,
  amountKes: number,
  couponCode?: string
): Promise<PaymentAttemptResult> {
  const user = await requireUser();
  const course = await db.course.findUnique({ where: { slug } });
  if (!course) return { status: "failed", message: "Course not found." };

  if (!isValidMpesaPhone(phone)) {
    return { status: "failed", message: "Enter a valid M-Pesa number in the format 2547XXXXXXXX." };
  }

  const outcome = simulateMpesa(phone);

  if (outcome.kind === "pending") {
    const payment = await db.payment.create({
      data: { userId: user.id, courseId: course.id, amountKes, method: "MPESA", status: "PENDING", couponCode, payload: JSON.stringify({ phone }) },
    });
    return { status: "pending", paymentId: payment.id };
  }

  if (outcome.kind === "failed") {
    await db.payment.create({
      data: { userId: user.id, courseId: course.id, amountKes, method: "MPESA", status: "FAILED", couponCode, payload: JSON.stringify({ phone }) },
    });
    await notify("payment_failed", { userId: user.id, courseId: course.id, method: "mpesa" });
    return { status: "failed", message: outcome.message };
  }

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      courseId: course.id,
      amountKes,
      method: "MPESA",
      status: "SUCCESS",
      reference: outcome.receipt,
      couponCode,
      payload: JSON.stringify({ phone }),
    },
  });
  await finalizeEnrollment(user.id, course.id, payment.id, couponCode ? "COUPON" : "PURCHASE");
  if (couponCode) await recordCouponUsage(couponCode, user.id, payment.id);
  await notify("payment_received", { userId: user.id, courseId: course.id, method: "mpesa", amountKes });
  return { status: "success", slug };
}

export async function attemptCardPaymentAction(
  slug: string,
  cardNumber: string,
  expiry: string,
  cvv: string,
  amountKes: number,
  couponCode?: string
): Promise<PaymentAttemptResult> {
  const user = await requireUser();
  const course = await db.course.findUnique({ where: { slug } });
  if (!course) return { status: "failed", message: "Course not found." };

  if (!isValidLuhn(cardNumber)) return { status: "failed", message: "Enter a valid card number." };
  if (!isValidExpiry(expiry)) return { status: "failed", message: "Card expiry is invalid or in the past." };
  if (!/^\d{3,4}$/.test(cvv)) return { status: "failed", message: "CVV must be 3 or 4 digits." };

  const outcome = simulateCard(cardNumber);

  if (outcome.kind === "failed") {
    await db.payment.create({
      data: { userId: user.id, courseId: course.id, amountKes, method: "CARD", status: "FAILED", couponCode },
    });
    await notify("payment_failed", { userId: user.id, courseId: course.id, method: "card" });
    return { status: "failed", message: outcome.message };
  }

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      courseId: course.id,
      amountKes,
      method: "CARD",
      status: "SUCCESS",
      reference: outcome.chargeId,
      couponCode,
    },
  });
  await finalizeEnrollment(user.id, course.id, payment.id, couponCode ? "COUPON" : "PURCHASE");
  if (couponCode) await recordCouponUsage(couponCode, user.id, payment.id);
  await notify("payment_received", { userId: user.id, courseId: course.id, method: "card", amountKes });
  return { status: "success", slug };
}

export async function cancelPendingPaymentAction(paymentId: string) {
  await db.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } }).catch(() => {});
}

async function recordCouponUsage(code: string, userId: string, paymentId: string) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) return;
  await db.couponUsage.create({ data: { couponId: coupon.id, userId, paymentId } });
}

export async function goToLearnAction(slug: string) {
  redirect(`/learn/${slug}?enrolled=success`);
}
