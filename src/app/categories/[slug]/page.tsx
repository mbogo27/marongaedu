import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CourseFiltersPanel from "@/components/CourseFiltersPanel";
import CourseSortSearch from "@/components/CourseSortSearch";
import CourseGridResults from "@/components/CourseGridResults";
import CurrencyToggle from "@/components/CurrencyToggle";
import { getDisplayCurrency } from "@/lib/currency";
import { listCourses, getCategories, type CourseSort } from "@/lib/queries";
import { db } from "@/lib/db";
import type { Level } from "@prisma/client";

type SearchParams = Record<string, string | string[] | undefined>;

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const [category, categories] = await Promise.all([
    db.category.findUnique({ where: { slug } }),
    getCategories(),
  ]);
  if (!category) notFound();

  const filters = {
    category: [slug],
    level: toArray(sp.level).filter((l) => ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].includes(l)) as Level[],
    price: (sp.price === "free" || sp.price === "paid" ? sp.price : undefined) as "free" | "paid" | undefined,
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    duration: (["short", "medium", "long", "xlong"].includes(String(sp.duration)) ? sp.duration : undefined) as "short" | "medium" | "long" | "xlong" | undefined,
    minRating: sp.minRating ? Number(sp.minRating) : undefined,
    search: (sp.search as string) || undefined,
    sort: (["popular", "newest", "price-asc", "price-desc", "rating"].includes(String(sp.sort)) ? sp.sort : "popular") as CourseSort,
    page: sp.page ? Number(sp.page) : 1,
  };

  const { courses, total, totalPages, page } = await listCourses(filters);
  const money = await getDisplayCurrency();

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-3xl text-teal-900">{category.name}</h1>
            <CurrencyToggle current={money.currency} />
          </div>
          {category.description && <p className="mt-2 max-w-2xl text-ink/70">{category.description}</p>}

          <div className="mt-8 flex flex-col gap-8 lg:flex-row">
            <CourseFiltersPanel categories={categories} hideCategoryFilter />
            <div className="min-w-0 flex-1">
              <CourseSortSearch />
              <CourseGridResults
                courses={courses}
                total={total}
                page={page}
                totalPages={totalPages}
                basePath={`/categories/${slug}`}
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
