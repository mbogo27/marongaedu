import "server-only";
import { Prisma, type Payment } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatRetry, getRateLimiter } from "@/lib/rate-limit";
import { effectivePrice, checkCoupon, computeQuote, type CouponLike } from "@/lib/domain/pricing";
import { GATE_MESSAGE_KEY } from "@/lib/domain/enrollment-rules";
import { advisoryLock, getEnrollmentGate, revokeEnrollment, upsertEnrollment, type Tx } from "@/lib/enrollment";
import { getPaymentProvider } from "@/lib/payments";
import { cardBrand, isValidMpesaPhone, normalizeMpesaPhone } from "@/lib/payments/validation";
import type { CardInput } from "@/lib/payments/types";
import { sendAdminEmail, sendEmail } from "@/lib/email/send";
import { notify } from "@/lib/notify";
import { getSetting } from "@/lib/settings";
import { track } from "@/lib/analytics";
import { formatKes } from "@/lib/format";
import { t, type MessageKey } from "@/lib/i18n";

/* ---------------- coupon + quote (server-authoritative) ---------------- */

export type QuoteResult =
  | { ok: true; subtotalKes: number; discountKes: number; totalKes: number; coupon: { code: string; id: string } | null }
  | { ok: false; error: string };

async function loadCoupon(code: string): Promise<(CouponLike & { id: string }) | null> {
  const c = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() }, include: { courses: true } });
  if (!c) return null;
  return {
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    usageLimit: c.usageLimit,
    perUserLimit: c.perUserLimit,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    isActive: c.isActive,
    courseIds: c.courses.map((x) => x.courseId),
  };
}

/** Price a course for a user, validating the coupon. The client never supplies an amount. */
export async function quoteCourse(
  userId: string,
  course: { id: string; isFree: boolean; priceKes: number; salePriceKes: number | null; saleEndsAt: Date | null },
  couponCode?: string | null,
  tx: Tx | typeof db = db
): Promise<QuoteResult> {
  if (!couponCode?.trim()) {
    return { ok: true, ...computeQuote(course, null), coupon: null };
  }
  const coupon = await loadCoupon(couponCode);
  const [totalUses, userUses] = coupon
    ? await Promise.all([
        tx.couponUsage.count({ where: { couponId: coupon.id } }),
        tx.couponUsage.count({ where: { couponId: coupon.id, userId } }),
      ])
    : [0, 0];
  const verdict = checkCoupon(coupon, { courseId: course.id, now: new Date(), totalUses, userUses });
  if (!verdict.ok) return { ok: false, error: t(verdict.error) };
  return { ok: true, ...computeQuote(course, coupon!), coupon: { code: coupon!.code, id: coupon!.id } };
}

/* ---------------- checkout ---------------- */

export type CheckoutInput = {
  slug: string;
  method: "mpesa" | "card";
  couponCode?: string | null;
  idempotencyKey: string;
  phone?: string;
  card?: CardInput;
};

export type CheckoutResult =
  | { status: "success"; paymentId: string; slug: string }
  | { status: "pending"; paymentId: string; method: "mpesa" | "card" }
  | { status: "failed"; message: string; paymentId?: string }
  | { status: "error"; message: string };

const PENDING_REUSE_MS = 30 * 60_000;
const MPESA_EXPIRY_MS = 10 * 60_000;
const CARD_EXPIRY_MS = 2 * 60_000;

function stateOf(p: Payment, slug: string): CheckoutResult {
  if (p.status === "SUCCESS") return { status: "success", paymentId: p.id, slug };
  if (p.status === "PENDING") return { status: "pending", paymentId: p.id, method: p.method === "CARD" ? "card" : "mpesa" };
  return { status: "failed", message: p.failureReason ?? "Payment was not completed.", paymentId: p.id };
}

export async function startCheckout(user: { id: string; name: string; email: string }, input: CheckoutInput): Promise<CheckoutResult> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.idempotencyKey)) return { status: "error", message: t("auth.generic_error") };

  // Card-testing / abuse guard: 15 checkout attempts per user per hour.
  const rl = await getRateLimiter().consume(`checkout:user:${user.id}`, 15, 3600);
  if (rl.blocked) return { status: "error", message: t("auth.too_many_attempts", { wait: formatRetry(rl.retryAfterSec) }) };

  const course = await db.course.findFirst({ where: { slug: input.slug, status: "PUBLISHED", deletedAt: null } });
  if (!course) return { status: "error", message: t("checkout.course_not_found") };
  if (effectivePrice(course) === 0 && !input.couponCode) return { status: "error", message: "This course is free — use Enroll instead." };

  // Cheap input validation before touching the DB / provider.
  if (input.method === "mpesa" && !(input.phone && isValidMpesaPhone(input.phone))) {
    return { status: "failed", message: t("checkout.invalid_phone") };
  }

  // Replay of the same attempt (double click, retry): return the existing result.
  const replay = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (replay) {
    if (replay.userId !== user.id) return { status: "error", message: t("auth.generic_error") };
    return stateOf(replay, course.slug);
  }

  type Created = { kind: "reuse"; payment: Payment } | { kind: "error"; message: string } | { kind: "created"; payment: Payment; total: number };
  let created: Created;
  try {
    created = await db.$transaction(async (tx): Promise<Created> => {
      await advisoryLock(tx, `checkout:${user.id}:${course.id}`);

      const gate = await getEnrollmentGate(course, user.id, tx);
      if (gate !== "open") return { kind: "error", message: t(GATE_MESSAGE_KEY[gate]) };

      const pending = await tx.payment.findFirst({
        where: { userId: user.id, courseId: course.id, status: "PENDING", createdAt: { gt: new Date(Date.now() - PENDING_REUSE_MS) } },
        orderBy: { createdAt: "desc" },
      });
      if (pending) return { kind: "reuse", payment: pending };

      const quote = await quoteCourse(user.id, course, input.couponCode, tx);
      if (!quote.ok) return { kind: "error", message: quote.error };

      const digits = input.card?.number.replace(/\D/g, "") ?? "";
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          idempotencyKey: input.idempotencyKey,
          subtotalKes: quote.subtotalKes,
          discountKes: quote.discountKes,
          amountKes: quote.totalKes,
          method: quote.totalKes === 0 ? "FREE" : input.method === "mpesa" ? "MPESA" : "CARD",
          status: "PENDING",
          couponCode: quote.coupon?.code ?? null,
          phone: input.method === "mpesa" && input.phone ? normalizeMpesaPhone(input.phone) : null,
          // Brand + last4 only. The PAN, expiry and CVV are never persisted.
          cardBrand: input.method === "card" && digits ? cardBrand(digits) : null,
          cardLast4: input.method === "card" && digits ? digits.slice(-4) : null,
        },
      });
      return { kind: "created", payment, total: quote.totalKes };
    });
  } catch (e) {
    // Lost a race on the unique idempotency key: the other request owns this attempt.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing && existing.userId === user.id) return stateOf(existing, course.slug);
    }
    throw e;
  }

  if (created.kind === "error") return { status: "failed", message: created.message };
  if (created.kind === "reuse") return stateOf(created.payment, course.slug);

  const payment = created.payment;
  track("checkout_started", { courseId: course.id, method: input.method, amountKes: payment.amountKes });

  // A coupon that brings the price to KES 0 completes without a provider.
  if (created.total === 0) {
    const done = await finalizeSuccess(payment.id, { reference: `coupon-${payment.id.slice(-8)}` });
    return done ? { status: "success", paymentId: payment.id, slug: course.slug } : { status: "failed", message: t("auth.generic_error") };
  }

  const provider = getPaymentProvider(input.method);
  const outcome = await provider.initiate({
    paymentId: payment.id,
    amountKes: payment.amountKes,
    phone: input.phone,
    card: input.card,
  });

  if (outcome.status === "success") {
    await finalizeSuccess(payment.id, { reference: outcome.reference, cardBrand: outcome.cardBrand, cardLast4: outcome.cardLast4 });
    return { status: "success", paymentId: payment.id, slug: course.slug };
  }
  if (outcome.status === "failed") {
    await markFailed(payment.id, outcome.message);
    return { status: "failed", message: outcome.message, paymentId: payment.id };
  }
  await db.payment.update({ where: { id: payment.id }, data: { reference: outcome.reference } });
  return { status: "pending", paymentId: payment.id, method: input.method };
}

/* ---------------- state transitions ---------------- */

async function nextInvoiceNumber(tx: Tx, prefix: string): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>(Prisma.sql`
    INSERT INTO "Sequence" ("name", "value") VALUES ('invoice', 1)
    ON CONFLICT ("name") DO UPDATE SET "value" = "Sequence"."value" + 1
    RETURNING "value"`);
  return `${prefix}-${new Date().getFullYear()}-${String(rows[0].value).padStart(5, "0")}`;
}

/**
 * PENDING → SUCCESS, exactly once. In one transaction: mark paid, number the
 * invoice, record coupon usage, create/reactivate the enrollment, write the
 * notification. Emails and analytics fire after commit (spec §7.2.5).
 * Returns false if another caller already finalised the payment.
 */
export async function finalizeSuccess(
  paymentId: string,
  info: { reference: string; cardBrand?: string; cardLast4?: string }
): Promise<boolean> {
  const invoiceSettings = await getSetting("invoice");

  const done = await db.$transaction(async (tx) => {
    const before = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!before) return null;
    await advisoryLock(tx, `enroll:${before.courseId}`);

    const claim = await tx.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "SUCCESS" } });
    if (claim.count !== 1) return null; // already finalised/failed/cancelled

    const enrollment = await upsertEnrollment(tx, {
      userId: before.userId,
      courseId: before.courseId,
      source: before.couponCode ? "COUPON" : "PURCHASE",
    });
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        reference: info.reference,
        enrollmentId: enrollment.id,
        invoiceNumber: before.amountKes > 0 ? await nextInvoiceNumber(tx, invoiceSettings.prefix) : null,
        ...(info.cardBrand ? { cardBrand: info.cardBrand } : {}),
        ...(info.cardLast4 ? { cardLast4: info.cardLast4 } : {}),
      },
      include: { user: true, course: true },
    });

    if (payment.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: payment.couponCode } });
      if (coupon) await tx.couponUsage.create({ data: { couponId: coupon.id, userId: payment.userId, paymentId: payment.id } });
    }
    return payment;
  });

  if (!done) return false;

  await notify("payment_received", {
    userId: done.userId, courseId: done.courseId, course: done.course.title, method: done.method.toLowerCase(), amountKes: done.amountKes,
  });
  await notify("enrollment", { userId: done.userId, courseId: done.courseId, course: done.course.title });
  track("payment_succeeded", { courseId: done.courseId, method: done.method, amountKes: done.amountKes });

  const amount = formatKes(done.amountKes);
  await sendEmail(
    "enrollmentConfirmation",
    done.user.email,
    {
      name: done.user.name,
      course: done.course.title,
      amount,
      reference: done.reference,
      receipt: done.amountKes > 0 ? ` Receipt ${done.invoiceNumber ?? ""}: ${amount} paid (ref ${done.reference}).` : "",
    },
    { link: `/learn/${done.course.slug}`, userId: done.userId }
  );
  const notifySettings = await getSetting("notifications");
  if (notifySettings.adminNewEnrollment) {
    await sendAdminEmail("adminNewEnrollment", { name: done.user.name, email: done.user.email, course: done.course.title, amount }, "/admin/enrollments");
  }
  return true;
}

/** PENDING → FAILED. Returns false if it was no longer pending. */
export async function markFailed(paymentId: string, reason: string): Promise<boolean> {
  const claim = await db.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED", failureReason: reason } });
  if (claim.count !== 1) return false;
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { user: true, course: true } });
  await notify("payment_failed", { userId: payment.userId, courseId: payment.courseId, method: payment.method.toLowerCase(), reason });
  track("payment_failed", { courseId: payment.courseId, method: payment.method, reason });
  await sendEmail(
    "paymentFailed",
    payment.user.email,
    { name: payment.user.name, course: payment.course.title, reason },
    { link: `/checkout/${payment.course.slug}`, userId: payment.userId }
  );
  return true;
}

export async function cancelPayment(userId: string, paymentId: string): Promise<boolean> {
  const res = await db.payment.updateMany({
    where: { id: paymentId, userId, status: "PENDING" },
    data: { status: "CANCELLED", failureReason: "Cancelled by you." },
  });
  return res.count === 1;
}

export type PaymentPoll =
  | { status: "SUCCESS"; slug: string }
  | { status: "PENDING" }
  | { status: "FAILED" | "CANCELLED" | "REFUNDED"; message: string };

/** Poll endpoint logic: ask the provider about a pending charge and settle it. */
export async function pollPayment(userId: string, paymentId: string): Promise<PaymentPoll | null> {
  let payment = await db.payment.findFirst({ where: { id: paymentId, userId }, include: { course: { select: { slug: true } } } });
  if (!payment) return null;

  if (payment.status === "PENDING") {
    const age = Date.now() - payment.createdAt.getTime();
    if (payment.method === "MPESA" && payment.reference) {
      const res = await getPaymentProvider("mpesa").getStatus(payment.reference);
      if (res.status === "success") await finalizeSuccess(payment.id, { reference: res.reference });
      else if (res.status === "failed") await markFailed(payment.id, res.message);
      else if (age > MPESA_EXPIRY_MS) await markFailed(payment.id, "The payment request timed out.");
    } else if (age > (payment.method === "CARD" ? CARD_EXPIRY_MS : MPESA_EXPIRY_MS)) {
      await markFailed(payment.id, "The payment request timed out.");
    }
    payment = await db.payment.findFirstOrThrow({ where: { id: paymentId, userId }, include: { course: { select: { slug: true } } } });
  }

  if (payment.status === "SUCCESS") return { status: "SUCCESS", slug: payment.course.slug };
  if (payment.status === "PENDING") return { status: "PENDING" };
  return { status: payment.status, message: payment.failureReason ?? "Payment was not completed." };
}

/* ---------------- refunds ---------------- */

export type RefundOutcome = { ok: true } | { ok: false; error: string };

/** Admin refund (spec §7.3): provider refund → REFUNDED, enrollment revoked, learner emailed, audit-logged. */
export async function refundPayment(actorId: string, paymentId: string): Promise<RefundOutcome> {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { user: true, course: true } });
  if (!payment) return { ok: false, error: t("common.not_found") };
  if (payment.status !== "SUCCESS") return { ok: false, error: "Only successful payments can be refunded." };
  if (payment.amountKes <= 0 || (payment.method !== "MPESA" && payment.method !== "CARD")) {
    return { ok: false, error: "Free and manual enrollments have nothing to refund — use “Revoke access” instead." };
  }

  const provider = getPaymentProvider(payment.method === "MPESA" ? "mpesa" : "card");
  const res = await provider.refund(payment.reference ?? payment.id, payment.amountKes);
  if (!res.ok) return { ok: false, error: res.message ?? "The provider rejected the refund." };

  const refunded = await db.$transaction(async (tx) => {
    const claim = await tx.payment.updateMany({
      where: { id: paymentId, status: "SUCCESS" },
      data: { status: "REFUNDED", refundedAt: new Date(), payload: { refundReference: res.reference ?? null } },
    });
    if (claim.count !== 1) return false;
    if (payment.enrollmentId) await revokeEnrollment(tx, payment.enrollmentId);
    return true;
  });
  if (!refunded) return { ok: false, error: "This payment was already refunded." };

  await audit({ actorId, action: "payment.refund", targetType: "payment", targetId: paymentId, meta: { amountKes: payment.amountKes, userId: payment.userId, courseId: payment.courseId } });
  await notify("refund", { userId: payment.userId, courseId: payment.courseId, course: payment.course.title, amountKes: payment.amountKes });
  await sendEmail(
    "refundProcessed",
    payment.user.email,
    { name: payment.user.name, course: payment.course.title, amount: formatKes(payment.amountKes), reference: payment.reference ?? payment.id },
    { userId: payment.userId }
  );
  return { ok: true };
}

export type { MessageKey };
