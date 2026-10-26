import "server-only";
import { Prisma, type Level } from "@prisma/client";
import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/domain/pricing";

export const PAGE_SIZE = 12;

export type CourseSort = "popular" | "newest" | "price-asc" | "price-desc" | "rating";

export type CourseFilters = {
  category?: string[];
  level?: Level[];
  price?: "free" | "paid";
  /** Inclusive KES range on the effective price. */
  minPrice?: number;
  maxPrice?: number;
  duration?: "short" | "medium" | "long" | "xlong"; // <2h, 2–5h, 5–10h, 10h+
  minRating?: number;
  search?: string;
  sort?: CourseSort;
  page?: number;
  excludeId?: string;
};

function courseDurationSeconds(course: { modules: { lessons: { durationSeconds: number }[] }[] }) {
  return course.modules.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + l.durationSeconds, 0), 0);
}

function courseLessonCount(course: { modules: { lessons: unknown[] }[] }) {
  return course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export function ratingSummary(reviews: { rating: number }[]) {
  const count = reviews.length;
  if (count === 0) return { avg: 0, count: 0, breakdown: [0, 0, 0, 0, 0] };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const breakdown = [5, 4, 3, 2, 1].map((star) => Math.round((reviews.filter((r) => r.rating === star).length / count) * 100));
  return { avg: sum / count, count, breakdown };
}

const PUBLIC_COURSE = { status: "PUBLISHED", deletedAt: null } as const;

const courseCardInclude = {
  category: true,
  instructor: { select: { name: true } },
  modules: { include: { lessons: { select: { durationSeconds: true } } } },
  // Ratings are always computed from live reviews, never stored by hand (spec §5.1).
  reviews: { where: { status: "PUBLISHED" as const, deletedAt: null }, select: { rating: true } },
  _count: { select: { enrollments: { where: { status: "ACTIVE" as const } } } },
} satisfies Prisma.CourseInclude;

export type CourseCardData = ReturnType<typeof toCourseCard>;

export function toCourseCard(course: Prisma.CourseGetPayload<{ include: typeof courseCardInclude }>) {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    category: course.category,
    level: course.level,
    thumbnailUrl: course.thumbnailUrl,
    priceKes: course.priceKes,
    salePriceKes: course.salePriceKes,
    saleEndsAt: course.saleEndsAt,
    isFree: course.isFree,
    effectivePriceKes: effectivePrice(course),
    durationSeconds: courseDurationSeconds(course),
    lessonCount: courseLessonCount(course),
    enrollmentCount: course._count.enrollments,
    rating: ratingSummary(course.reviews),
    isFeatured: course.isFeatured,
    instructorName: course.instructor.name,
    publishedAt: course.publishedAt ?? course.createdAt,
  };
}

/**
 * Full-text search over title, subtitle, short description and lesson titles
 * (spec §5.1) using Postgres tsvector, plus a substring match so partial words
 * ("endo") still find things. Returns matching published course ids.
 */
export async function searchCourseIds(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT c."id" FROM "Course" c
    WHERE c."status" = 'PUBLISHED' AND c."deletedAt" IS NULL AND (
      to_tsvector('english', coalesce(c."title", '') || ' ' || coalesce(c."subtitle", '') || ' ' || coalesce(c."shortDescription", ''))
        @@ websearch_to_tsquery('english', ${q})
      OR c."title" ILIKE ${like}
      OR c."shortDescription" ILIKE ${like}
      OR EXISTS (
        SELECT 1 FROM "Module" m JOIN "Lesson" l ON l."moduleId" = m."id"
        WHERE m."courseId" = c."id" AND (
          to_tsvector('english', l."title") @@ websearch_to_tsquery('english', ${q}) OR l."title" ILIKE ${like}
        )
      )
    )
  `);
  return rows.map((r) => r.id);
}

export async function listCourses(filters: CourseFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.CourseWhereInput = { ...PUBLIC_COURSE };

  if (filters.category?.length) where.category = { slug: { in: filters.category } };
  if (filters.level?.length) where.level = { in: filters.level };
  if (filters.price === "free") where.isFree = true;
  if (filters.price === "paid") where.isFree = false;
  if (filters.excludeId) where.id = { not: filters.excludeId };
  if (filters.search?.trim()) {
    where.id = { in: await searchCourseIds(filters.search), ...(filters.excludeId ? { not: filters.excludeId } : {}) };
  }

  const all = await db.course.findMany({ where, include: courseCardInclude });
  let cards = all.map(toCourseCard);

  if (filters.minPrice != null) cards = cards.filter((c) => c.effectivePriceKes >= filters.minPrice!);
  if (filters.maxPrice != null) cards = cards.filter((c) => c.effectivePriceKes <= filters.maxPrice!);
  if (filters.duration) {
    cards = cards.filter((c) => {
      const hours = c.durationSeconds / 3600;
      if (filters.duration === "short") return hours < 2;
      if (filters.duration === "medium") return hours >= 2 && hours < 5;
      if (filters.duration === "long") return hours >= 5 && hours < 10;
      return hours >= 10;
    });
  }
  if (filters.minRating) cards = cards.filter((c) => c.rating.avg >= filters.minRating!);

  const sort = filters.sort ?? "popular";
  cards.sort((a, b) => {
    if (sort === "newest") return b.publishedAt.getTime() - a.publishedAt.getTime();
    if (sort === "price-asc") return a.effectivePriceKes - b.effectivePriceKes;
    if (sort === "price-desc") return b.effectivePriceKes - a.effectivePriceKes;
    if (sort === "rating") return b.rating.avg - a.rating.avg || b.rating.count - a.rating.count;
    return b.enrollmentCount - a.enrollmentCount;
  });

  const total = cards.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { courses: cards.slice(start, start + PAGE_SIZE), total, totalPages, page: safePage };
}

export async function getFeaturedCourses(limit = 4) {
  const all = await db.course.findMany({
    where: { ...PUBLIC_COURSE, isFeatured: true },
    include: courseCardInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return all.map(toCourseCard);
}

export async function getRelatedCourses(categoryId: string, excludeId: string, limit = 4) {
  const all = await db.course.findMany({
    where: { ...PUBLIC_COURSE, categoryId, id: { not: excludeId } },
    include: courseCardInclude,
    take: limit,
  });
  return all.map(toCourseCard);
}

export async function getCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { courses: { where: PUBLIC_COURSE } } } },
  });
}

/**
 * Course detail. Only published, non-deleted courses are public; admins may
 * load drafts/archived ones to preview them (spec §5.1).
 */
export async function getCourseDetail(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const course = await db.course.findFirst({
    where: { slug, ...(opts.includeUnpublished ? {} : PUBLIC_COURSE) },
    include: {
      category: true,
      instructor: true,
      outcomes: { orderBy: { sortOrder: "asc" } },
      requirements: { orderBy: { sortOrder: "asc" } },
      audience: { orderBy: { sortOrder: "asc" } },
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" } } } },
      reviews: {
        where: { status: "PUBLISHED", deletedAt: null },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          votes: { select: { userId: true, helpful: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!course) return null;

  return {
    ...course,
    effectivePriceKes: effectivePrice(course),
    durationSeconds: courseDurationSeconds(course),
    lessonCount: courseLessonCount(course),
    enrollmentCount: course._count.enrollments,
    rating: ratingSummary(course.reviews),
  };
}

/** Where did an old slug go? (spec §6: slug changes keep old links alive). */
export async function resolveSlugRedirect(slug: string): Promise<string | null> {
  const r = await db.slugRedirect.findUnique({ where: { fromSlug: slug }, include: { course: { select: { slug: true, status: true, deletedAt: true } } } });
  if (!r || r.course.deletedAt || r.course.status !== "PUBLISHED") return null;
  return r.course.slug;
}

export async function getInstructorStats(instructorId: string) {
  const courses = await db.course.findMany({
    where: { instructorId, ...PUBLIC_COURSE },
    include: {
      reviews: { where: { status: "PUBLISHED", deletedAt: null }, select: { rating: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  const allReviews = courses.flatMap((c) => c.reviews);
  return {
    courseCount: courses.length,
    totalStudents: courses.reduce((s, c) => s + c._count.enrollments, 0),
    rating: ratingSummary(allReviews),
  };
}

export { effectivePrice, courseDurationSeconds, courseLessonCount };
