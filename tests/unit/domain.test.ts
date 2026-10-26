import { describe, expect, it } from "vitest";
import { checkCoupon, computeQuote, couponDiscount, effectivePrice, type CouponLike } from "@/lib/domain/pricing";
import { enrollmentGate } from "@/lib/domain/enrollment-rules";
import { computeProgressPercent, isVideoWatched, lockedLessonIds, nextLessonId } from "@/lib/domain/progress";
import { gradeQuiz } from "@/lib/domain/quiz";
import { canTransition } from "@/lib/payments/types";

const base = { isFree: false, priceKes: 8500, salePriceKes: null as number | null, saleEndsAt: null as Date | null };
const NOW = new Date("2026-06-01T12:00:00Z");

describe("pricing", () => {
  it("uses the sale price while the sale is active", () => {
    expect(effectivePrice({ ...base, salePriceKes: 6000, saleEndsAt: new Date("2026-07-01") }, NOW)).toBe(6000);
    expect(effectivePrice({ ...base, salePriceKes: 6000 }, NOW)).toBe(6000); // no end date
  });
  it("ignores an expired sale and free courses cost nothing", () => {
    expect(effectivePrice({ ...base, salePriceKes: 6000, saleEndsAt: new Date("2026-05-01") }, NOW)).toBe(8500);
    expect(effectivePrice({ ...base, isFree: true }, NOW)).toBe(0);
  });

  const coupon: CouponLike = { code: "X", discountType: "PERCENT", discountValue: 10, usageLimit: 2, perUserLimit: 1, startsAt: null, endsAt: null, isActive: true, courseIds: [] };
  const ctx = { courseId: "c1", now: NOW, totalUses: 0, userUses: 0 };

  it("rounds percent discounts and caps fixed discounts at the price", () => {
    expect(couponDiscount(8500, { discountType: "PERCENT", discountValue: 10 })).toBe(850);
    expect(couponDiscount(333, { discountType: "PERCENT", discountValue: 10 })).toBe(33);
    expect(couponDiscount(300, { discountType: "FIXED", discountValue: 500 })).toBe(300);
  });
  it("computes the quote server-side from the course row", () => {
    expect(computeQuote({ ...base, salePriceKes: 4500 }, { discountType: "FIXED", discountValue: 500 }, NOW)).toEqual({ subtotalKes: 4500, discountKes: 500, totalKes: 4000 });
  });
  it("accepts a valid coupon", () => expect(checkCoupon(coupon, ctx)).toEqual({ ok: true }));
  it.each([
    ["missing", null, ctx, "checkout.coupon_not_found"],
    ["inactive", { ...coupon, isActive: false }, ctx, "checkout.coupon_not_found"],
    ["not started", { ...coupon, startsAt: new Date("2026-07-01") }, ctx, "checkout.coupon_not_started"],
    ["expired", { ...coupon, endsAt: new Date("2026-05-01") }, ctx, "checkout.coupon_expired"],
    ["wrong course", { ...coupon, courseIds: ["other"] }, ctx, "checkout.coupon_wrong_course"],
    ["exhausted", coupon, { ...ctx, totalUses: 2 }, "checkout.coupon_exhausted"],
    ["per-user limit", coupon, { ...ctx, userUses: 1 }, "checkout.coupon_used"],
  ] as const)("rejects a %s coupon", (_n, c, context, error) => {
    expect(checkCoupon(c as CouponLike | null, context)).toEqual({ ok: false, error });
  });
});

describe("enrollment gate", () => {
  const open = { enrollmentCap: null, enrollmentOpensAt: null, enrollmentClosesAt: null, activeEnrollments: 0, existing: null, now: NOW };
  it("is open by default and 'enrolled' for active enrollments", () => {
    expect(enrollmentGate(open)).toBe("open");
    expect(enrollmentGate({ ...open, existing: "ACTIVE" })).toBe("enrolled");
  });
  it("lets a revoked learner try again", () => expect(enrollmentGate({ ...open, existing: "REVOKED" })).toBe("open"));
  it("enforces cap and window", () => {
    expect(enrollmentGate({ ...open, enrollmentCap: 5, activeEnrollments: 5 })).toBe("sold_out");
    expect(enrollmentGate({ ...open, enrollmentCap: 5, activeEnrollments: 4 })).toBe("open");
    expect(enrollmentGate({ ...open, enrollmentClosesAt: new Date("2026-05-01") })).toBe("closed");
    expect(enrollmentGate({ ...open, enrollmentOpensAt: new Date("2026-07-01") })).toBe("not_open");
  });
});

describe("progress", () => {
  it("computes percentages", () => {
    expect(computeProgressPercent(0, 0)).toBe(0);
    expect(computeProgressPercent(10, 4)).toBe(40);
    expect(computeProgressPercent(3, 3)).toBe(100);
    expect(computeProgressPercent(3, 9)).toBe(100);
  });
  it("auto-completes videos at 90%", () => {
    expect(isVideoWatched(89, 100)).toBe(false);
    expect(isVideoWatched(90, 100)).toBe(true);
    expect(isVideoWatched(10, 0)).toBe(false);
  });
  const ids = ["a", "b", "c", "d"];
  it("locks nothing unless the course is sequential", () => {
    expect(lockedLessonIds(ids, new Set(), false).size).toBe(0);
  });
  it("locks everything after the first incomplete lesson when sequential", () => {
    expect([...lockedLessonIds(ids, new Set(), true)]).toEqual(["b", "c", "d"]);
    expect([...lockedLessonIds(ids, new Set(["a"]), true)]).toEqual(["c", "d"]);
    expect([...lockedLessonIds(ids, new Set(["a", "b", "c"]), true)]).toEqual([]);
    // completing a later lesson never unlocks past an incomplete earlier one
    expect([...lockedLessonIds(ids, new Set(["a", "c"]), true)]).toEqual(["c", "d"]);
  });
  it("finds where to continue", () => {
    expect(nextLessonId(ids, new Set(["a", "b"]))).toBe("c");
    expect(nextLessonId(ids, new Set(ids))).toBe("a");
    expect(nextLessonId([], new Set())).toBeNull();
  });
});

describe("quiz grading", () => {
  const questions = [
    { id: "q1", explanation: "because", options: [{ id: "a", isCorrect: false }, { id: "b", isCorrect: true }] },
    { id: "q2", explanation: null, options: [{ id: "c", isCorrect: true }, { id: "d", isCorrect: true }, { id: "e", isCorrect: false }] },
  ];
  it("scores exact matches and applies the pass mark", () => {
    const r = gradeQuiz(questions, { q1: ["b"], q2: ["c", "d"] }, 70);
    expect(r).toMatchObject({ scorePercent: 100, passed: true, correctCount: 2 });
    const half = gradeQuiz(questions, { q1: ["b"], q2: ["c"] }, 70);
    expect(half).toMatchObject({ scorePercent: 50, passed: false });
    expect(half.results[1].correct).toBe(false);
  });
  it("requires the full set for multi-select and ignores foreign option ids", () => {
    expect(gradeQuiz(questions, { q2: ["c", "d", "e"] }, 70).results[1].correct).toBe(false);
    expect(gradeQuiz(questions, { q1: ["b", "zzz"] }, 70).results[0].correct).toBe(true); // ids that do not belong to the question are ignored
    expect(gradeQuiz(questions, { q1: ["zzz"] }, 70).results[0].correct).toBe(false);
  });
  it("treats an empty quiz as passed", () => expect(gradeQuiz([], {}, 70)).toMatchObject({ scorePercent: 100, passed: true }));
  it("returns correct answers and explanations only in the graded result", () => {
    expect(gradeQuiz(questions, {}, 70).results[0]).toEqual({ questionId: "q1", correct: false, correctOptionIds: ["b"], explanation: "because" });
  });
});

describe("payment state machine", () => {
  it("only allows legal transitions", () => {
    expect(canTransition("PENDING", "SUCCESS")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canTransition("SUCCESS", "REFUNDED")).toBe(true);
    expect(canTransition("SUCCESS", "FAILED")).toBe(false);
    expect(canTransition("FAILED", "SUCCESS")).toBe(false);
    expect(canTransition("REFUNDED", "SUCCESS")).toBe(false);
    expect(canTransition("CANCELLED", "SUCCESS")).toBe(false);
  });
});
