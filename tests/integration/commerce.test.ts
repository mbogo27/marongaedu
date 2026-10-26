import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { cancelPayment, pollPayment, quoteCourse, refundPayment, startCheckout } from "@/lib/payments/service";
import { enrollInCourse } from "@/lib/enrollment";
import { setRateLimiter } from "@/lib/rate-limit";
import { MPESA_SIM_DELAY_MS } from "@/lib/payments/simulated";
import { makeCourse, makeUser, resetDb } from "../support/db";

const GOOD_CARD = { number: "4242 4242 4242 4242", expiry: "12/99", cvv: "123", holder: "T" };
const DECLINED = { ...GOOD_CARD, number: "4242 4200 0000 0000" };
const NO_FUNDS = { ...GOOD_CARD, number: "4242 4200 0008 0002" };
let key = 0;
const k = () => `test-key-${++key}-${Date.now()}`;

beforeEach(async () => {
  await resetDb();
  setRateLimiter(undefined);
});

async function buyer() {
  const u = await makeUser();
  return { id: u.id, name: u.name, email: u.email };
}

describe("checkout: server-side pricing", () => {
  it("charges the price computed on the server (sale price), never a client amount", async () => {
    const { course } = await makeCourse({ priceKes: 8500, salePriceKes: 6000 });
    const u = await buyer();
    const res = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD });
    expect(res.status).toBe("success");
    const p = await db.payment.findFirstOrThrow({ where: { userId: u.id } });
    expect(p.amountKes).toBe(6000);
    expect(p.subtotalKes).toBe(6000);
    expect(p.invoiceNumber).toMatch(/^INV-\d{4}-00001$/);
  });

  it("applies coupons and records usage; rejects expired, wrong-course and exhausted ones", async () => {
    const { course } = await makeCourse({ priceKes: 5000 });
    const other = await makeCourse({ priceKes: 5000 });
    const u = await buyer();
    await db.coupon.create({ data: { code: "TEN", discountType: "PERCENT", discountValue: 10 } });
    await db.coupon.create({ data: { code: "OLD", discountType: "PERCENT", discountValue: 50, endsAt: new Date(Date.now() - 86_400_000) } });
    const only = await db.coupon.create({ data: { code: "ONLYOTHER", discountType: "FIXED", discountValue: 500 } });
    await db.couponCourse.create({ data: { couponId: only.id, courseId: other.course.id } });
    await db.coupon.create({ data: { code: "ONCE", discountType: "FIXED", discountValue: 100, usageLimit: 1 } });
    const used = await buyer();

    expect(await quoteCourse(u.id, course, "OLD")).toMatchObject({ ok: false, error: "This coupon has expired." });
    expect(await quoteCourse(u.id, course, "ONLYOTHER")).toMatchObject({ ok: false, error: "This coupon doesn't apply to this course." });
    expect(await quoteCourse(u.id, course, "NOPE")).toMatchObject({ ok: false });

    // exhaust ONCE
    const first = await startCheckout(used, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD, couponCode: "ONCE" });
    expect(first.status).toBe("success");
    expect(await quoteCourse(u.id, course, "ONCE")).toMatchObject({ ok: false, error: "This coupon has reached its usage limit." });

    const res = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD, couponCode: "TEN" });
    expect(res.status).toBe("success");
    const p = await db.payment.findFirstOrThrow({ where: { userId: u.id } });
    expect(p).toMatchObject({ subtotalKes: 5000, discountKes: 500, amountKes: 4500, couponCode: "TEN" });
    expect(await db.couponUsage.count({ where: { userId: u.id } })).toBe(1);
  });

  it("refuses to start checkout with an invalid coupon instead of silently charging full price", async () => {
    const { course } = await makeCourse();
    const u = await buyer();
    const res = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD, couponCode: "WRONG" });
    expect(res.status).toBe("failed");
    expect(await db.enrollment.count()).toBe(0);
  });

  it("a coupon that brings the total to zero enrolls without a provider", async () => {
    const { course } = await makeCourse({ priceKes: 400 });
    const u = await buyer();
    await db.coupon.create({ data: { code: "FREEBIE", discountType: "FIXED", discountValue: 1000 } });
    expect((await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), couponCode: "FREEBIE" })).status).toBe("success");
    expect(await db.enrollment.count({ where: { userId: u.id, status: "ACTIVE" } })).toBe(1);
  });
});

describe("checkout: simulated outcomes", () => {
  it("card success creates the enrollment only after success", async () => {
    const { course } = await makeCourse();
    const u = await buyer();
    expect(await db.enrollment.count()).toBe(0);
    const res = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD });
    expect(res.status).toBe("success");
    const enrollment = await db.enrollment.findFirstOrThrow({ where: { userId: u.id } });
    const p = await db.payment.findFirstOrThrow({ where: { userId: u.id } });
    expect(p).toMatchObject({ status: "SUCCESS", method: "CARD", cardLast4: "4242", cardBrand: "visa", enrollmentId: enrollment.id });
    expect(JSON.stringify(p)).not.toContain("4242424242424242");
  });

  it.each([
    ["declined", DECLINED, "Your card was declined."],
    ["insufficient funds", NO_FUNDS, "Insufficient funds."],
  ])("card %s: no enrollment, failed payment row, learner emailed", async (_n, card, message) => {
    const { course } = await makeCourse();
    const u = await buyer();
    const res = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card });
    expect(res).toMatchObject({ status: "failed", message });
    expect(await db.enrollment.count()).toBe(0);
    expect(await db.payment.findFirstOrThrow({ where: { userId: u.id } })).toMatchObject({ status: "FAILED", failureReason: message });
    expect(await db.emailLog.count({ where: { to: u.email, template: "paymentFailed" } })).toBe(1);
  });

  it("M-Pesa: pending, then resolves to success after the STK delay", async () => {
    const { course } = await makeCourse();
    const u = await buyer();
    const res = await startCheckout(u, { slug: course.slug, method: "mpesa", idempotencyKey: k(), phone: "254712345678" });
    expect(res.status).toBe("pending");
    if (res.status !== "pending") return;
    expect(await pollPayment(u.id, res.paymentId)).toEqual({ status: "PENDING" });
    expect(await db.enrollment.count()).toBe(0);

    // fast-forward the stateless simulator by rewriting the reference's start time
    const p = await db.payment.findUniqueOrThrow({ where: { id: res.paymentId } });
    await db.payment.update({ where: { id: p.id }, data: { reference: p.reference!.replace(/^sim:\d+:/, `sim:${Date.now() - MPESA_SIM_DELAY_MS - 50}:`) } });
    expect(await pollPayment(u.id, res.paymentId)).toEqual({ status: "SUCCESS", slug: course.slug });
    expect(await db.payment.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: "SUCCESS", reference: expect.stringMatching(/^MDEMO[0-9A-F]{8}$/) });
    expect(await db.enrollment.count({ where: { userId: u.id, status: "ACTIVE" } })).toBe(1);
  });

  it("M-Pesa number ending 0000 fails; ending 1111 stays pending and can be cancelled", async () => {
    const { course } = await makeCourse();
    const failer = await buyer();
    const f = await startCheckout(failer, { slug: course.slug, method: "mpesa", idempotencyKey: k(), phone: "254712340000" });
    if (f.status !== "pending") throw new Error("expected pending");
    const fp = await db.payment.findUniqueOrThrow({ where: { id: f.paymentId } });
    await db.payment.update({ where: { id: fp.id }, data: { reference: fp.reference!.replace(/^sim:\d+:/, `sim:${Date.now() - 6000}:`) } });
    expect(await pollPayment(failer.id, f.paymentId)).toMatchObject({ status: "FAILED", message: "Payment not confirmed. Try again." });

    const holder = await buyer();
    const h = await startCheckout(holder, { slug: course.slug, method: "mpesa", idempotencyKey: k(), phone: "254712341111" });
    if (h.status !== "pending") throw new Error("expected pending");
    const hp = await db.payment.findUniqueOrThrow({ where: { id: h.paymentId } });
    await db.payment.update({ where: { id: hp.id }, data: { reference: hp.reference!.replace(/^sim:\d+:/, `sim:${Date.now() - 120_000}:`) } });
    expect(await pollPayment(holder.id, h.paymentId)).toEqual({ status: "PENDING" });
    expect(await cancelPayment(holder.id, h.paymentId)).toBe(true);
    expect(await pollPayment(holder.id, h.paymentId)).toMatchObject({ status: "CANCELLED" });
    expect(await db.enrollment.count()).toBe(0);
  });

  it("only the owner can poll or cancel a payment", async () => {
    const { course } = await makeCourse();
    const a = await buyer();
    const b = await buyer();
    const r = await startCheckout(a, { slug: course.slug, method: "mpesa", idempotencyKey: k(), phone: "254712341111" });
    if (r.status !== "pending") throw new Error("expected pending");
    expect(await pollPayment(b.id, r.paymentId)).toBeNull();
    expect(await cancelPayment(b.id, r.paymentId)).toBe(false);
  });
});

describe("checkout: idempotency and double submits", () => {
  it("the same idempotency key never double-charges, even concurrently", async () => {
    const { course } = await makeCourse();
    const u = await buyer();
    const idem = k();
    const results = await Promise.all([1, 2, 3].map(() => startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: idem, card: GOOD_CARD })));
    expect(results.every((r) => r.status === "success" || r.status === "pending")).toBe(true);
    expect(await db.payment.count({ where: { userId: u.id } })).toBe(1);
    expect(await db.payment.count({ where: { userId: u.id, status: "SUCCESS" } })).toBe(1);
    expect(await db.enrollment.count({ where: { userId: u.id } })).toBe(1);
  });

  it("two different keys in a row (double-click after a re-render) still charge once", async () => {
    const { course } = await makeCourse();
    const u = await buyer();
    const [a, b] = await Promise.all([
      startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD }),
      startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD }),
    ]);
    expect([a.status, b.status]).toContain("success");
    expect(await db.payment.count({ where: { userId: u.id, status: "SUCCESS" } })).toBe(1);
    expect(await db.enrollment.count({ where: { userId: u.id } })).toBe(1);
  });

  it("an already-enrolled learner cannot pay again", async () => {
    const { course } = await makeCourse();
    const u = await buyer();
    await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD });
    const again = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD });
    expect(again).toMatchObject({ status: "failed", message: "You're already enrolled in this course." });
    expect(await db.payment.count({ where: { userId: u.id, status: "SUCCESS" } })).toBe(1);
  });

  it("another user cannot replay someone else's idempotency key", async () => {
    const { course } = await makeCourse();
    const a = await buyer();
    const b = await buyer();
    const idem = k();
    await startCheckout(a, { slug: course.slug, method: "card", idempotencyKey: idem, card: GOOD_CARD });
    expect((await startCheckout(b, { slug: course.slug, method: "card", idempotencyKey: idem, card: GOOD_CARD })).status).toBe("error");
  });
});

describe("enrollment rules", () => {
  it("enforces the cap atomically (two simultaneous free enrollments for the last seat)", async () => {
    const { course } = await makeCourse({ isFree: true, priceKes: 0, enrollmentCap: 1 });
    const [a, b] = [await makeUser(), await makeUser()];
    const results = await Promise.all([
      enrollInCourse({ userId: a.id, courseId: course.id, source: "FREE" }),
      enrollInCourse({ userId: b.id, courseId: course.id, source: "FREE" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ error: "This course is sold out." });
    expect(await db.enrollment.count({ where: { courseId: course.id, status: "ACTIVE" } })).toBe(1);
  });

  it("rejects enrollment outside the window and double enrollment; admin manual enrollment bypasses the gate", async () => {
    const { course } = await makeCourse({ isFree: true, priceKes: 0 });
    await db.course.update({ where: { id: course.id }, data: { enrollmentClosesAt: new Date(Date.now() - 1000) } });
    const u = await makeUser();
    expect(await enrollInCourse({ userId: u.id, courseId: course.id, source: "FREE" })).toMatchObject({ ok: false, error: "Enrollment for this course is closed." });
    expect((await enrollInCourse({ userId: u.id, courseId: course.id, source: "MANUAL", bypassGate: true })).ok).toBe(true);
    expect(await enrollInCourse({ userId: u.id, courseId: course.id, source: "MANUAL", bypassGate: true })).toMatchObject({ ok: false });
  });
});

describe("refunds", () => {
  it("refunds via the provider, revokes access, keeps progress, and allows re-enrollment", async () => {
    const { course, lessons } = await makeCourse();
    const admin = await makeUser({ role: "ADMIN" });
    const u = await buyer();
    await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD });
    const enrollment = await db.enrollment.findFirstOrThrow({ where: { userId: u.id } });
    await db.lessonProgress.create({ data: { enrollmentId: enrollment.id, lessonId: lessons[0].id, completed: true } });
    const payment = await db.payment.findFirstOrThrow({ where: { userId: u.id } });

    expect(await refundPayment(admin.id, payment.id)).toEqual({ ok: true });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "REFUNDED" });
    expect(await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).toMatchObject({ status: "REVOKED" });
    expect(await db.lessonProgress.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
    expect(await db.emailLog.count({ where: { to: u.email, template: "refundProcessed" } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "payment.refund", targetId: payment.id } })).toBe(1);

    expect(await refundPayment(admin.id, payment.id)).toMatchObject({ ok: false }); // not twice

    // buying again reactivates the same enrollment (progress restored)
    const again = await startCheckout(u, { slug: course.slug, method: "card", idempotencyKey: k(), card: GOOD_CARD });
    expect(again.status).toBe("success");
    const restored = await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(restored.status).toBe("ACTIVE");
    expect(await db.enrollment.count({ where: { userId: u.id } })).toBe(1);
    expect(await db.lessonProgress.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
  });

  it("will not 'refund' free or manual enrollments", async () => {
    const { course } = await makeCourse({ isFree: true, priceKes: 0 });
    const admin = await makeUser({ role: "ADMIN" });
    const u = await makeUser();
    await enrollInCourse({ userId: u.id, courseId: course.id, source: "FREE" });
    const p = await db.payment.findFirstOrThrow({ where: { userId: u.id } });
    expect(await refundPayment(admin.id, p.id)).toMatchObject({ ok: false });
  });
});
