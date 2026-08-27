"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { notify } from "@/lib/notify";

async function getEnrollmentOrThrow(userId: string, courseSlug: string) {
  const course = await db.course.findUnique({ where: { slug: courseSlug } });
  if (!course) throw new Error("Course not found");
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });
  if (!enrollment) throw new Error("Not enrolled");
  return { course, enrollment };
}

async function recomputeProgress(enrollmentId: string, courseId: string) {
  const totalLessons = await db.lesson.count({ where: { module: { courseId } } });
  const completedLessons = await db.lessonProgress.count({ where: { enrollmentId, completed: true } });
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const enrollment = await db.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPercent: percent,
      completedAt: percent >= 100 ? new Date() : null,
    },
    include: { course: true, user: true },
  });

  if (percent >= 100) {
    const existingCert = await db.certificate.findUnique({ where: { enrollmentId } });
    if (!existingCert) {
      await db.certificate.create({ data: { enrollmentId } });
      await notify("course_completed", { userId: enrollment.userId, courseId, course: enrollment.course.title });
      await notify("certificate_issued", { userId: enrollment.userId, courseId, course: enrollment.course.title });
    }
  }

  return percent;
}

export async function updateLessonPositionAction(courseSlug: string, lessonId: string, positionSeconds: number) {
  const user = await requireUser();
  const { enrollment } = await getEnrollmentOrThrow(user.id, courseSlug);

  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { lastPositionSeconds: positionSeconds },
    create: { enrollmentId: enrollment.id, lessonId, lastPositionSeconds: positionSeconds },
  });
}

export async function markLessonCompleteAction(courseSlug: string, lessonId: string) {
  const user = await requireUser();
  const { course, enrollment } = await getEnrollmentOrThrow(user.id, courseSlug);

  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { completed: true },
    create: { enrollmentId: enrollment.id, lessonId, completed: true },
  });
  await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lessonId } });

  await recomputeProgress(enrollment.id, course.id);
  revalidatePath(`/learn/${courseSlug}`);
}

export type QuizSubmission = Record<string, string[]>; // questionId -> selected option ids

export async function submitQuizAction(courseSlug: string, lessonId: string, answers: QuizSubmission) {
  const user = await requireUser();
  const { course, enrollment } = await getEnrollmentOrThrow(user.id, courseSlug);

  const questions = await db.quizQuestion.findMany({ where: { lessonId }, include: { options: true } });
  let correctCount = 0;
  const results: Record<string, boolean> = {};

  for (const q of questions) {
    const correctIds = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
    const selected = new Set(answers[q.id] ?? []);
    const isCorrect =
      correctIds.size === selected.size && [...correctIds].every((id) => selected.has(id));
    results[q.id] = isCorrect;
    if (isCorrect) correctCount++;
  }

  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100;
  const passed = scorePercent >= 70;

  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { completed: passed, quizScorePercent: scorePercent },
    create: { enrollmentId: enrollment.id, lessonId, completed: passed, quizScorePercent: scorePercent },
  });

  if (passed) {
    await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lessonId } });
    await recomputeProgress(enrollment.id, course.id);
  }

  revalidatePath(`/learn/${courseSlug}`);
  return { scorePercent, passed, results };
}

export async function saveNoteAction(lessonId: string, content: string, videoTimestampSeconds?: number) {
  const user = await requireUser();

  const existing = await db.lessonNote.findFirst({ where: { userId: user.id, lessonId, videoTimestampSeconds: null } });
  if (videoTimestampSeconds == null && existing) {
    await db.lessonNote.update({ where: { id: existing.id }, data: { content } });
    return existing.id;
  }

  const note = await db.lessonNote.create({
    data: { userId: user.id, lessonId, content, videoTimestampSeconds },
  });
  return note.id;
}

export async function deleteNoteAction(noteId: string) {
  const user = await requireUser();
  await db.lessonNote.deleteMany({ where: { id: noteId, userId: user.id } });
}
