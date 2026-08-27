"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { saveUpload } from "@/lib/storage";
import { slugify } from "@/lib/format";
import type { EditableModule } from "@/components/admin/CurriculumBuilder";

export type SaveState = { error?: string } | undefined;

function toDate(value: FormDataEntryValue | null): Date | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveCourseAction(courseId: string | null, _prev: SaveState, formData: FormData): Promise<SaveState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Title is required." };

  let slug = String(formData.get("slug") || "").trim() || slugify(title);
  slug = slugify(slug);

  const existingWithSlug = await db.course.findUnique({ where: { slug } });
  if (existingWithSlug && existingWithSlug.id !== courseId) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const status = (String(formData.get("status") || "DRAFT")) as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  const isFree = formData.get("isFree") === "on";
  const priceKes = Number(formData.get("priceKes") || 0);
  const salePriceKesRaw = formData.get("salePriceKes");
  const salePriceKes = salePriceKesRaw && String(salePriceKesRaw).trim() ? Number(salePriceKesRaw) : null;

  const thumbnailFile = formData.get("thumbnailFile") as File | null;
  let thumbnailUrl = String(formData.get("thumbnailUrl") || "").trim() || `https://picsum.photos/seed/${slug}/800/450`;
  if (thumbnailFile && thumbnailFile.size > 0) {
    thumbnailUrl = await saveUpload(thumbnailFile, "thumbnails");
  }

  const previewVideoFile = formData.get("previewVideoFile") as File | null;
  let previewVideoUrl = String(formData.get("previewVideoUrl") || "").trim() || "/videos/placeholder-1.mp4";
  if (previewVideoFile && previewVideoFile.size > 0) {
    previewVideoUrl = await saveUpload(previewVideoFile, "videos");
  }

  const categoryId = String(formData.get("categoryId") || "");
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) return { error: "Choose a category." };

  const data = {
    title,
    slug,
    subtitle: String(formData.get("subtitle") || "") || null,
    description: String(formData.get("descriptionHtml") || "<p></p>"),
    shortDescription: String(formData.get("shortDescription") || "").slice(0, 200),
    categoryId,
    instructorId: admin.id,
    level: String(formData.get("level") || "BEGINNER") as never,
    language: String(formData.get("language") || "English"),
    priceKes: isFree ? 0 : priceKes,
    salePriceKes: isFree ? null : salePriceKes,
    saleEndsAt: toDate(formData.get("saleEndsAt")),
    isFree,
    thumbnailUrl,
    previewVideoUrl,
    status,
    isFeatured: formData.get("isFeatured") === "on",
    enrollmentCap: formData.get("enrollmentCap") ? Number(formData.get("enrollmentCap")) : null,
    enrollmentOpensAt: toDate(formData.get("enrollmentOpensAt")),
    enrollmentClosesAt: toDate(formData.get("enrollmentClosesAt")),
    metaTitle: String(formData.get("metaTitle") || "") || null,
    metaDescription: String(formData.get("metaDescription") || "") || null,
    ogImageUrl: String(formData.get("ogImageUrl") || "") || null,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };

  const outcomes: string[] = JSON.parse(String(formData.get("outcomesJson") || "[]")).filter(Boolean);
  const requirements: string[] = JSON.parse(String(formData.get("requirementsJson") || "[]")).filter(Boolean);
  const audience: string[] = JSON.parse(String(formData.get("audienceJson") || "[]")).filter(Boolean);
  const modules: EditableModule[] = JSON.parse(String(formData.get("curriculumJson") || "[]"));

  const course = await db.$transaction(async (tx) => {
    const saved = courseId
      ? await tx.course.update({ where: { id: courseId }, data })
      : await tx.course.create({ data });

    await tx.courseOutcome.deleteMany({ where: { courseId: saved.id } });
    await tx.courseRequirement.deleteMany({ where: { courseId: saved.id } });
    await tx.courseAudience.deleteMany({ where: { courseId: saved.id } });
    if (outcomes.length) await tx.courseOutcome.createMany({ data: outcomes.map((text, i) => ({ courseId: saved.id, text, sortOrder: i })) });
    if (requirements.length) await tx.courseRequirement.createMany({ data: requirements.map((text, i) => ({ courseId: saved.id, text, sortOrder: i })) });
    if (audience.length) await tx.courseAudience.createMany({ data: audience.map((text, i) => ({ courseId: saved.id, text, sortOrder: i })) });

    await tx.module.deleteMany({ where: { courseId: saved.id } });
    for (const [mi, mod] of modules.entries()) {
      const createdModule = await tx.module.create({
        data: { courseId: saved.id, title: mod.title, description: mod.description || null, sortOrder: mi },
      });
      for (const [li, lesson] of mod.lessons.entries()) {
        let content: Record<string, unknown> = {};
        if (lesson.type === "VIDEO") content = { videoUrl: lesson.videoUrl, captionUrl: lesson.captionUrl || undefined, transcript: lesson.transcript };
        else if (lesson.type === "READING") content = { html: lesson.readingHtml };
        else if (lesson.type === "RESOURCE") content = { label: lesson.resourceLabel, url: lesson.resourceUrl };
        else if (lesson.type === "QUIZ") content = { instructions: lesson.quizInstructions };

        const createdLesson = await tx.lesson.create({
          data: {
            moduleId: createdModule.id,
            title: lesson.title,
            type: lesson.type,
            durationSeconds: lesson.minutes * 60,
            content: JSON.stringify(content),
            isFreePreview: lesson.isFreePreview,
            sortOrder: li,
          },
        });

        if (lesson.type === "QUIZ") {
          for (const [qi, q] of lesson.questions.entries()) {
            const createdQuestion = await tx.quizQuestion.create({
              data: { lessonId: createdLesson.id, question: q.question, type: q.type, explanation: q.explanation || null, sortOrder: qi },
            });
            if (q.options.length) {
              await tx.quizOption.createMany({
                data: q.options.map((o, oi) => ({ questionId: createdQuestion.id, text: o.text, isCorrect: o.isCorrect, sortOrder: oi })),
              });
            }
          }
        }
      }
    }

    return saved;
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/courses/${course.slug}`);
  redirect(`/admin/courses/${course.slug}`);
}

export async function duplicateCourseAction(courseId: string) {
  await requireAdmin();
  const source = await db.course.findUnique({
    where: { id: courseId },
    include: {
      outcomes: true,
      requirements: true,
      audience: true,
      modules: { include: { lessons: { include: { quizQuestions: { include: { options: true } } } } } },
    },
  });
  if (!source) return;

  const newSlug = `${source.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
  await db.$transaction(async (tx) => {
    const copy = await tx.course.create({
      data: {
        title: `${source.title} (Copy)`,
        slug: newSlug,
        subtitle: source.subtitle,
        description: source.description,
        shortDescription: source.shortDescription,
        categoryId: source.categoryId,
        instructorId: source.instructorId,
        level: source.level,
        language: source.language,
        priceKes: source.priceKes,
        salePriceKes: source.salePriceKes,
        isFree: source.isFree,
        thumbnailUrl: source.thumbnailUrl,
        previewVideoUrl: source.previewVideoUrl,
        status: "DRAFT",
        isFeatured: false,
      },
    });
    await tx.courseOutcome.createMany({ data: source.outcomes.map((o) => ({ courseId: copy.id, text: o.text, sortOrder: o.sortOrder })) });
    await tx.courseRequirement.createMany({ data: source.requirements.map((o) => ({ courseId: copy.id, text: o.text, sortOrder: o.sortOrder })) });
    await tx.courseAudience.createMany({ data: source.audience.map((o) => ({ courseId: copy.id, text: o.text, sortOrder: o.sortOrder })) });

    for (const mod of source.modules) {
      const newModule = await tx.module.create({ data: { courseId: copy.id, title: mod.title, description: mod.description, sortOrder: mod.sortOrder } });
      for (const lesson of mod.lessons) {
        const newLesson = await tx.lesson.create({
          data: {
            moduleId: newModule.id,
            title: lesson.title,
            type: lesson.type,
            durationSeconds: lesson.durationSeconds,
            content: lesson.content,
            isFreePreview: lesson.isFreePreview,
            sortOrder: lesson.sortOrder,
          },
        });
        for (const q of lesson.quizQuestions) {
          const newQuestion = await tx.quizQuestion.create({
            data: { lessonId: newLesson.id, question: q.question, type: q.type, explanation: q.explanation, sortOrder: q.sortOrder },
          });
          if (q.options.length) {
            await tx.quizOption.createMany({ data: q.options.map((o) => ({ questionId: newQuestion.id, text: o.text, isCorrect: o.isCorrect, sortOrder: o.sortOrder })) });
          }
        }
      }
    }
  });

  revalidatePath("/admin/courses");
}

export async function archiveCourseAction(courseId: string) {
  await requireAdmin();
  await db.course.update({ where: { id: courseId }, data: { status: "ARCHIVED" } });
  revalidatePath("/admin/courses");
}

export async function publishCourseAction(courseId: string) {
  await requireAdmin();
  await db.course.update({ where: { id: courseId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  revalidatePath("/admin/courses");
}

export async function deleteCourseAction(courseId: string) {
  await requireAdmin();
  await db.course.update({ where: { id: courseId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  revalidatePath("/admin/courses");
}
