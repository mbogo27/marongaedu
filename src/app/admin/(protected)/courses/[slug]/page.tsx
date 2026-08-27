import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CourseEditorForm, { type EditorCourse } from "@/components/admin/CourseEditorForm";
import { parseLessonContent, type VideoLessonContent, type ReadingLessonContent, type ResourceLessonContent, type QuizLessonContent } from "@/lib/content-types";
import type { EditableModule } from "@/components/admin/CurriculumBuilder";

export default async function EditCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, categories] = await Promise.all([
    db.course.findUnique({
      where: { slug },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        requirements: { orderBy: { sortOrder: "asc" } },
        audience: { orderBy: { sortOrder: "asc" } },
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              include: { quizQuestions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
            },
          },
        },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!course) notFound();

  const modules: EditableModule[] = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description ?? "",
    lessons: m.lessons.map((l) => {
      const base = {
        id: l.id,
        title: l.title,
        type: l.type,
        minutes: Math.round(l.durationSeconds / 60),
        isFreePreview: l.isFreePreview,
        videoUrl: "",
        captionUrl: "",
        transcript: "",
        readingHtml: "<p></p>",
        resourceLabel: "",
        resourceUrl: "",
        quizInstructions: "",
        questions: l.quizQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          explanation: q.explanation ?? "",
          options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        })),
      };
      if (l.type === "VIDEO") {
        const c = parseLessonContent<VideoLessonContent>(l.content);
        return { ...base, videoUrl: c.videoUrl ?? "", captionUrl: c.captionUrl ?? "", transcript: c.transcript ?? "" };
      }
      if (l.type === "READING") {
        const c = parseLessonContent<ReadingLessonContent>(l.content);
        return { ...base, readingHtml: c.html ?? "<p></p>" };
      }
      if (l.type === "RESOURCE") {
        const c = parseLessonContent<ResourceLessonContent>(l.content);
        return { ...base, resourceLabel: c.label ?? "", resourceUrl: c.url ?? "" };
      }
      const c = parseLessonContent<QuizLessonContent>(l.content);
      return { ...base, quizInstructions: c.instructions ?? "" };
    }),
  }));

  const editorCourse: EditorCourse = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle,
    categoryId: course.categoryId,
    level: course.level,
    language: course.language,
    priceKes: course.priceKes,
    salePriceKes: course.salePriceKes,
    saleEndsAt: course.saleEndsAt?.toISOString() ?? null,
    isFree: course.isFree,
    shortDescription: course.shortDescription,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    previewVideoUrl: course.previewVideoUrl,
    metaTitle: course.metaTitle,
    metaDescription: course.metaDescription,
    ogImageUrl: course.ogImageUrl,
    isFeatured: course.isFeatured,
    enrollmentCap: course.enrollmentCap,
    enrollmentOpensAt: course.enrollmentOpensAt?.toISOString() ?? null,
    enrollmentClosesAt: course.enrollmentClosesAt?.toISOString() ?? null,
    status: course.status,
    outcomes: course.outcomes.map((o) => o.text),
    requirements: course.requirements.map((o) => o.text),
    audience: course.audience.map((o) => o.text),
    modules,
  };

  return <CourseEditorForm course={editorCourse} categories={categories} />;
}
