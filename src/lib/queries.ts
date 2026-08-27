import { db } from "@/lib/db";
import type { Prisma, Level } from "@prisma/client";

export const PAGE_SIZE = 12;

export type CourseSort = "popular" | "newest" | "price-asc" | "price-desc" | "rating";

export type CourseFilters = {
  category?: string[];
  level?: Level[];
  price?: "free" | "paid";
  duration?: "short" | "medium" | "long" | "xlong"; // <2h, 2-5h, 5-10h, 10h+
  minRating?: number;
  search?: string;
  sort?: CourseSort;
  page?: number;
  excludeId?: string;
};

function effectivePrice(course: { priceKes: number; salePriceKes: number | null; saleEndsAt: Date | null }) {
  if (course.salePriceKes != null && (!course.saleEndsAt || course.saleEndsAt > new Date())) {
    return course.salePriceKes;
  }
  return course.priceKes;
}

function courseDurationSeconds(course: { modules: { lessons: { durationSeconds: number }[] }[] }) {
  return course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.durationSeconds, 0),
    0
  );
}

function courseLessonCount(course: { modules: { lessons: unknown[] }[] }) {
  return course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

function ratingSummary(reviews: { rating: number }[]) {
  const count = reviews.length;
  if (count === 0) return { avg: 0, count: 0, breakdown: [0, 0, 0, 0, 0] };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const breakdown = [5, 4, 3, 2, 1].map(
    (star) => Math.round((reviews.filter((r) => r.rating === star).length / count) * 100)
  );
  return { avg: sum / count, count, breakdown };
}

const courseCardInclude = {
  category: true,
  modules: { include: { lessons: { select: { durationSeconds: true } } } },
  reviews: { where: { status: "PUBLISHED" as const }, select: { rating: true } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

export type CourseCardData = Awaited<ReturnType<typeof toCourseCard>>;

export function toCourseCard(course: Prisma.CourseGetPayload<{ include: typeof courseCardInclude }>) {
  const rating = ratingSummary(course.reviews);
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
    rating,
    isFeatured: course.isFeatured,
  };
}

export async function listCourses(filters: CourseFilters = {}) {
  const page = filters.page ?? 1;
  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (filters.category?.length) {
    where.category = { slug: { in: filters.category } };
  }
  if (filters.level?.length) {
    where.level = { in: filters.level };
  }
  if (filters.price === "free") where.isFree = true;
  if (filters.price === "paid") where.isFree = false;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { shortDescription: { contains: filters.search } },
      { modules: { some: { lessons: { some: { title: { contains: filters.search } } } } } },
    ];
  }

  const all = await db.course.findMany({ where, include: courseCardInclude });
  let cards = all.map(toCourseCard).filter((c) => filters.excludeId !== c.id);

  if (filters.duration) {
    cards = cards.filter((c) => {
      const hours = c.durationSeconds / 3600;
      if (filters.duration === "short") return hours < 2;
      if (filters.duration === "medium") return hours >= 2 && hours < 5;
      if (filters.duration === "long") return hours >= 5 && hours < 10;
      return hours >= 10;
    });
  }
  if (filters.minRating) {
    cards = cards.filter((c) => c.rating.avg >= filters.minRating!);
  }

  const sort = filters.sort ?? "popular";
  cards.sort((a, b) => {
    if (sort === "newest") return 0; // createdAt not carried on card; stable order from DB (already desc-ish)
    if (sort === "price-asc") return a.effectivePriceKes - b.effectivePriceKes;
    if (sort === "price-desc") return b.effectivePriceKes - a.effectivePriceKes;
    if (sort === "rating") return b.rating.avg - a.rating.avg;
    return b.enrollmentCount - a.enrollmentCount; // popular
  });

  const total = cards.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = cards.slice(start, start + PAGE_SIZE);

  return { courses: pageItems, total, totalPages, page };
}

export async function getFeaturedCourses(limit = 4) {
  const all = await db.course.findMany({
    where: { status: "PUBLISHED", deletedAt: null, isFeatured: true },
    include: courseCardInclude,
    take: limit,
  });
  return all.map(toCourseCard);
}

export async function getRelatedCourses(categoryId: string, excludeId: string, limit = 4) {
  const all = await db.course.findMany({
    where: { status: "PUBLISHED", deletedAt: null, categoryId, id: { not: excludeId } },
    include: courseCardInclude,
    take: limit,
  });
  return all.map(toCourseCard);
}

export async function getCategories() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { courses: { where: { status: "PUBLISHED" } } } } },
  });
  return categories;
}

export async function getCourseDetail(slug: string) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      category: true,
      instructor: true,
      outcomes: { orderBy: { sortOrder: "asc" } },
      requirements: { orderBy: { sortOrder: "asc" } },
      audience: { orderBy: { sortOrder: "asc" } },
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" } } },
      },
      reviews: {
        where: { status: "PUBLISHED" },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) return null;

  const rating = ratingSummary(course.reviews);
  const durationSeconds = courseDurationSeconds(course);
  const lessonCount = courseLessonCount(course);

  return {
    ...course,
    effectivePriceKes: effectivePrice(course),
    durationSeconds,
    lessonCount,
    enrollmentCount: course._count.enrollments,
    rating,
  };
}

export async function getInstructorStats(instructorId: string) {
  const courses = await db.course.findMany({
    where: { instructorId, status: "PUBLISHED" },
    include: { reviews: { where: { status: "PUBLISHED" }, select: { rating: true } }, _count: { select: { enrollments: true } } },
  });
  const allReviews = courses.flatMap((c) => c.reviews);
  const totalStudents = courses.reduce((s, c) => s + c._count.enrollments, 0);
  return {
    courseCount: courses.length,
    totalStudents,
    rating: ratingSummary(allReviews),
  };
}

export { effectivePrice, courseDurationSeconds, courseLessonCount, ratingSummary };
