import CourseCard from "@/components/CourseCard";
import Pagination from "@/components/Pagination";
import type { CourseCardData } from "@/lib/queries";

export default function CourseGridResults({
  courses,
  total,
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  courses: CourseCardData[];
  total: number;
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-teal-200 bg-white px-6 py-16 text-center">
        <p className="font-serif text-xl text-teal-900">No courses match your filters</p>
        <p className="mt-2 text-sm text-ink/80">Try widening your search or clearing a filter.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink/70" role="status">{total} course{total === 1 ? "" : "s"}</p>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} basePath={basePath} searchParams={searchParams} />
    </div>
  );
}
