import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CourseFiltersPanel from "@/components/CourseFiltersPanel";
import CourseSortSearch from "@/components/CourseSortSearch";
import CourseGridResults from "@/components/CourseGridResults";
import { listCourses, getCategories, type CourseSort } from "@/lib/queries";
import type { Level } from "@prisma/client";

type SearchParams = Record<string, string | string[] | undefined>;

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const categories = await getCategories();

  const filters = {
    category: toArray(sp.category),
    level: toArray(sp.level) as Level[],
    price: (sp.price as "free" | "paid" | undefined) || undefined,
    duration: (sp.duration as "short" | "medium" | "long" | "xlong" | undefined) || undefined,
    minRating: sp.minRating ? Number(sp.minRating) : undefined,
    search: (sp.search as string) || undefined,
    sort: (sp.sort as CourseSort) || "popular",
    page: sp.page ? Number(sp.page) : 1,
  };

  const { courses, total, totalPages, page } = await listCourses(filters);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="font-serif text-3xl text-teal-900">All courses</h1>
          <p className="mt-2 text-ink/70">Browse the full catalog of dental courses taught by Dr. Maronga.</p>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row">
            <CourseFiltersPanel categories={categories} />
            <div className="min-w-0 flex-1">
              <CourseSortSearch />
              <CourseGridResults
                courses={courses}
                total={total}
                page={page}
                totalPages={totalPages}
                basePath="/courses"
                searchParams={sp}
              />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
