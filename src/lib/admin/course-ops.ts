import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const newId = () => `c${randomBytes(9).toString("hex")}`;

/** Deep copy: modules, lessons, quizzes. Lands as a Draft with a suffixed slug (spec §6). */
export async function duplicateCourse(adminId: string, courseId: string) {
  const source = await db.course.findUnique({
    where: { id: courseId },
    include: {
      outcomes: true,
      requirements: true,
      audience: true,
      modules: { include: { lessons: { include: { quizQuestions: { include: { options: true } } } } } },
    },
  });
  if (!source) return null;

  const suffix = Math.random().toString(36).slice(2, 6);
  const copy = await db.$transaction(async (tx) => {
    const c = await tx.course.create({
      data: {
        title: `${source.title} (Copy)`,
        slug: `${source.slug}-copy-${suffix}`,
        subtitle: source.subtitle,
        description: source.description,
        shortDescription: source.shortDescription,
        categoryId: source.categoryId,
        instructorId: source.instructorId,
        level: source.level,
        language: source.language,
        priceKes: source.priceKes,
        salePriceKes: source.salePriceKes,
        saleEndsAt: source.saleEndsAt,
        isFree: source.isFree,
        thumbnailUrl: source.thumbnailUrl,
        previewVideoUrl: source.previewVideoUrl,
        requireSequential: source.requireSequential,
        certificateTemplate: source.certificateTemplate,
        metaTitle: source.metaTitle,
        metaDescription: source.metaDescription,
        ogImageUrl: source.ogImageUrl,
        status: "DRAFT",
        isFeatured: false,
      },
    });
    const copyList = (xs: { text: string; sortOrder: number }[]) => xs.map((x) => ({ courseId: c.id, text: x.text, sortOrder: x.sortOrder }));
    await tx.courseOutcome.createMany({ data: copyList(source.outcomes) });
    await tx.courseRequirement.createMany({ data: copyList(source.requirements) });
    await tx.courseAudience.createMany({ data: copyList(source.audience) });

    for (const mod of source.modules) {
      const m = await tx.module.create({ data: { id: newId(), courseId: c.id, title: mod.title, description: mod.description, sortOrder: mod.sortOrder } });
      for (const lesson of mod.lessons) {
        const l = await tx.lesson.create({
          data: {
            id: newId(),
            moduleId: m.id,
            title: lesson.title,
            type: lesson.type,
            durationSeconds: lesson.durationSeconds,
            content: lesson.content ?? {},
            passMark: lesson.passMark,
            isFreePreview: lesson.isFreePreview,
            sortOrder: lesson.sortOrder,
          },
        });
        for (const q of lesson.quizQuestions) {
          const nq = await tx.quizQuestion.create({
            data: { id: newId(), lessonId: l.id, question: q.question, type: q.type, explanation: q.explanation, sortOrder: q.sortOrder },
          });
          if (q.options.length) {
            await tx.quizOption.createMany({
              data: q.options.map((o) => ({ id: newId(), questionId: nq.id, text: o.text, isCorrect: o.isCorrect, sortOrder: o.sortOrder })),
            });
          }
        }
      }
    }
    return c;
  });

  await audit({ actorId: adminId, action: "course.duplicate", targetType: "course", targetId: copy.id, meta: { from: courseId } });
  return copy;
}

/** Quick status change from the course list; publishing re-checks the required checklist against the DB. */
export async function setCourseStatus(
  adminId: string,
  courseId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const course = await db.course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: { modules: { include: { lessons: { select: { id: true } } } } },
  });
  if (!course) return { ok: false, error: "Course not found." };

  if (status === "PUBLISHED") {
    const missing: string[] = [];
    if (!course.title.trim()) missing.push("title");
    if (!course.slug) missing.push("slug");
    if (!course.thumbnailUrl.trim()) missing.push("thumbnail");
    if (!course.modules.some((m) => m.lessons.length > 0)) missing.push("a module with a lesson");
    if (missing.length) return { ok: false, error: `Cannot publish yet. Missing: ${missing.join(", ")}.` };
  }
  await db.course.update({
    where: { id: courseId },
    data: { status, ...(status === "PUBLISHED" && !course.publishedAt ? { publishedAt: new Date() } : {}) },
  });
  await audit({
    actorId: adminId,
    action: status === "PUBLISHED" ? "course.publish" : status === "ARCHIVED" ? "course.archive" : "course.unpublish",
    targetType: "course",
    targetId: courseId,
  });
  return { ok: true };
}
