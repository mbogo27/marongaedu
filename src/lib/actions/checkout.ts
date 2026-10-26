"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { cancelPayment, quoteCourse, startCheckout, type CheckoutInput, type CheckoutResult } from "@/lib/payments/service";
import { t } from "@/lib/i18n";

export type CouponQuote =
  | { valid: true; code: string; subtotalKes: number; discountKes: number; totalKes: number }
  | { valid: false; error: string };

/** Preview a coupon. The amounts are computed on the server from the course row — nothing is trusted from the client. */
export async function applyCouponAction(slug: string, code: string): Promise<CouponQuote> {
  const user = await requireUser();
  const course = await db.course.findFirst({ where: { slug, status: "PUBLISHED", deletedAt: null } });
  if (!course) return { valid: false, error: t("checkout.course_not_found") };
  const quote = await quoteCourse(user.id, course, code);
  if (!quote.ok) return { valid: false, error: quote.error };
  return { valid: true, code: quote.coupon!.code, subtotalKes: quote.subtotalKes, discountKes: quote.discountKes, totalKes: quote.totalKes };
}

/** Start a payment. Price, coupon and eligibility are all recomputed server-side; the card is never stored. */
export async function startCheckoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  const user = await requireUser();
  return startCheckout(user, input);
}

export async function cancelPaymentAction(paymentId: string) {
  const user = await requireUser();
  return cancelPayment(user.id, paymentId);
}
