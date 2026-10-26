import "server-only";
import { db } from "@/lib/db";
import { computeProgressPercent } from "@/lib/domain/progress";
import { issueCertificate } from "@/lib/certificates";
import { track } from "@/lib/analytics";

/**
 * Recompute an enrollment's progress from lesson_progress (spec §5.3).
 * At 100% sets `completedAt` and issues the certificate (idempotent).
 */
export async function recomputeProgress(enrollmentId: string) {
  const enrollment = await db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  const [total, done] = await Promise.all([
    db.lesson.count({ where: { module: { courseId: enrollment.courseId } } }),
    db.lessonProgress.count({
      where: { enrollmentId, completed: true, lesson: { module: { courseId: enrollment.courseId } } },
    }),
  ]);
  const percent = computeProgressPercent(total, done);

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { progressPercent: percent, completedAt: percent >= 100 ? (enrollment.completedAt ?? new Date()) : null },
  });

  if (percent >= 100 && enrollment.status === "ACTIVE") {
    await issueCertificate(enrollmentId);
  }
  return percent;
}

/** Mark a lesson (in)complete for an enrollment and refresh progress. */
export async function setLessonCompletion(enrollmentId: string, lessonId: string, completed: boolean) {
  const prev = await db.lessonProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId, lessonId } } });
  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    update: { completed, completedAt: completed ? (prev?.completedAt ?? new Date()) : null },
    create: { enrollmentId, lessonId, completed, completedAt: completed ? new Date() : null },
  });
  if (completed && !prev?.completed) track("lesson_completed", { lessonId });
  return recomputeProgress(enrollmentId);
}
