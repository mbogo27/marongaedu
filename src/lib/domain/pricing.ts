/**
 * Pricing + coupon rules (spec §7.2). Pure functions: the checkout server
 * action loads rows, calls these, and never trusts any amount from the client.
 * Money is integer KES.
 */
import type { MessageKey } from "@/lib/i18n";

export type PricedCourse = {
  isFree: boolean;
  priceKes: number;
  salePriceKes: number | null;
  saleEndsAt: Date | null;
};

/** Sale price applies while the sale hasn't ended; free courses cost 0. */
export function effectivePrice(course: PricedCourse, now = new Date()): number {
  if (course.isFree) return 0;
  if (course.salePriceKes != null && course.salePriceKes >= 0 && (!course.saleEndsAt || course.saleEndsAt > now)) {
    return course.salePriceKes;
  }
  return course.priceKes;
}

export type CouponLike = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  /** Course ids the coupon is restricted to; empty = all courses. */
  courseIds: string[];
};

export type CouponContext = {
  courseId: string;
  now: Date;
  /** Total redemptions so far (all users). */
  totalUses: number;
  /** Redemptions by the current user. */
  userUses: number;
};

export type CouponVerdict = { ok: true } | { ok: false; error: MessageKey };

export function checkCoupon(coupon: CouponLike | null, ctx: CouponContext): CouponVerdict {
  if (!coupon || !coupon.isActive) return { ok: false, error: "checkout.coupon_not_found" };
  if (coupon.startsAt && coupon.startsAt > ctx.now) return { ok: false, error: "checkout.coupon_not_started" };
  if (coupon.endsAt && coupon.endsAt < ctx.now) return { ok: false, error: "checkout.coupon_expired" };
  if (coupon.courseIds.length > 0 && !coupon.courseIds.includes(ctx.courseId)) {
    return { ok: false, error: "checkout.coupon_wrong_course" };
  }
  if (coupon.usageLimit != null && ctx.totalUses >= coupon.usageLimit) return { ok: false, error: "checkout.coupon_exhausted" };
  if (coupon.perUserLimit != null && ctx.userUses >= coupon.perUserLimit) return { ok: false, error: "checkout.coupon_used" };
  return { ok: true };
}

export function couponDiscount(subtotalKes: number, coupon: Pick<CouponLike, "discountType" | "discountValue">): number {
  const raw = coupon.discountType === "PERCENT" ? Math.round((subtotalKes * coupon.discountValue) / 100) : coupon.discountValue;
  return Math.min(subtotalKes, Math.max(0, raw));
}

export type Quote = { subtotalKes: number; discountKes: number; totalKes: number };

export function computeQuote(course: PricedCourse, coupon: Pick<CouponLike, "discountType" | "discountValue"> | null, now = new Date()): Quote {
  const subtotalKes = effectivePrice(course, now);
  const discountKes = coupon ? couponDiscount(subtotalKes, coupon) : 0;
  return { subtotalKes, discountKes, totalKes: subtotalKes - discountKes };
}
