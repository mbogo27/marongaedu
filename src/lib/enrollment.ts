import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type Enrollment, type EnrollmentSource } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { enrollmentGate, GATE_MESSAGE_KEY, type EnrollmentGate } from "@/lib/domain/enrollment-rules";
import { t } from "@/lib/i18n";

export type Tx = Prisma.TransactionClient;

/** Serialise concurrent operations on a key within the current transaction (Postgres advisory lock). */
export async function advisoryLock(tx: Tx, key: string) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`);
}

export async function activeEnrollmentCount(courseId: string, tx: Tx | typeof db = db) {
  return tx.enrollment.count({ where: { courseId, status: "ACTIVE" } });
}

/** Current enroll-button state for a viewer (spec §5.1). */
export async function getEnrollmentGate(
  course: { id: string; enrollmentCap: number | null; enrollmentOpensAt: Date | null; enrollmentClosesAt: Date | null },
  userId: string | null,
  tx: Tx | typeof db = db
): Promise<EnrollmentGate> {
  const [activeEnrollments, existing] = await Promise.all([
    course.enrollmentCap != null ? activeEnrollmentCount(course.id, tx) : Promise.resolve(0),
    userId
      ? tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } }, select: { status: true } })
      : Promise.resolve(null),
  ]);
  return enrollmentGate({ ...course, activeEnrollments, existing: existing?.status ?? null });
}

/** Create the enrollment, or reactivate a previously revoked one (progress is retained). */
export async function upsertEnrollment(
  tx: Tx,
  input: { userId: string; courseId: string; source: EnrollmentSource }
): Promise<Enrollment> {
  const existing = await tx.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
  });
  if (existing) {
    if (existing.status === "ACTIVE") return existing;
    const enrollment = await tx.enrollment.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", revokedAt: null, source: input.source },
    });
    // Re-enrolling restores the learner's certificate if they had earned one.
    await tx.certificate.updateMany({ where: { enrollmentId: existing.id }, data: { revokedAt: null } });
    return enrollment;
  }
  return tx.enrollment.create({ data: input });
}

export type EnrollResult = { ok: true; enrollment: Enrollment } | { ok: false; error: string };

/**
 * Enroll in a FREE course (or comp/manual). Enforces the cap and enrollment
 * window under an advisory lock so two simultaneous requests can't both take
 * the last seat (spec §5.2).
 */
export async function enrollInCourse(input: {
  userId: string;
  courseId: string;
  source: EnrollmentSource;
  /** Admin manual enrollments bypass the cap/window (comps, support). */
  bypassGate?: boolean;
  actorId?: string;
}): Promise<EnrollResult> {
  const result = await db.$transaction(async (tx) => {
    await advisoryLock(tx, `enroll:${input.courseId}`);
    const course = await tx.course.findUnique({ where: { id: input.courseId } });
    if (!course || course.deletedAt) return { ok: false as const, error: t("checkout.course_not_found") };

    if (!input.bypassGate) {
      const gate = await getEnrollmentGate(course, input.userId, tx);
      if (gate !== "open") return { ok: false as const, error: t(GATE_MESSAGE_KEY[gate]) };
    } else {
      const existing = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
      });
      if (existing?.status === "ACTIVE") return { ok: false as const, error: t("enroll.already") };
    }

    const enrollment = await upsertEnrollment(tx, { userId: input.userId, courseId: input.courseId, source: input.source });
    await tx.payment.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        enrollmentId: enrollment.id,
        idempotencyKey: `${input.source.toLowerCase()}:${randomUUID()}`,
        amountKes: 0,
        method: input.source === "MANUAL" ? "MANUAL" : "FREE",
        status: "SUCCESS",
      },
    });
    return { ok: true as const, enrollment, courseTitle: course.title };
  });

  if (result.ok && input.source === "MANUAL") {
    await audit({
      actorId: input.actorId,
      action: "enrollment.manual",
      targetType: "enrollment",
      targetId: result.enrollment.id,
      meta: { userId: input.userId, courseId: input.courseId },
    });
  }
  return result.ok ? { ok: true, enrollment: result.enrollment } : result;
}

/**
 * Revoke access (refund / admin action). Progress and the enrollment row are
 * kept so re-enrolling restores them; the certificate is revoked (spec §5.2, §9).
 */
export async function revokeEnrollment(tx: Tx, enrollmentId: string) {
  const now = new Date();
  await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: "REVOKED", revokedAt: now } });
  await tx.certificate.updateMany({ where: { enrollmentId, revokedAt: null }, data: { revokedAt: now } });
}
