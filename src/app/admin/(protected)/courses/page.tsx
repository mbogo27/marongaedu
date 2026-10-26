import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatKes } from "@/lib/format";
import { levelLabel } from "@/lib/content-types";
import { Badge, PageHeader, Pager, dangerBtn, filterButton, filterInput, linkBtn, statusTone, tableWrap, td, th } from "@/components/admin/ui";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { duplicateCourseAction, setCourseStatusAction, deleteCourseAction } from "@/lib/actions/admin/courses";

const PER_PAGE = 25;

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string; page?: string }>;
}) {
  const { status, category, search, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const where: Prisma.CourseWhereInput = {
    deletedAt: null,
    ...(status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? { status } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };

  const [total, courses, categories] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      include: { category: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const revenue = await db.payment.groupBy({
    by: ["courseId"],
    where: { status: "SUCCESS", courseId: { in: courses.map((c) => c.id) } },
    _sum: { amountKes: true },
  });
  const revenueBy = new Map(revenue.map((r) => [r.courseId, r._sum.amountKes ?? 0]));

  return (
    <div>
      <PageHeader
        title="Courses"
        actions={
          <Link href="/admin/courses/new" className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            + New course
          </Link>
        }
      />

      <form className="mt-6 flex flex-wrap gap-3" role="search" aria-label="Filter courses">
        <label className="sr-only" htmlFor="f-search">Search by title</label>
        <input id="f-search" name="search" defaultValue={search} placeholder="Search by title…" className={filterInput} />
        <label className="sr-only" htmlFor="f-status">Status</label>
        <select id="f-status" name="status" defaultValue={status ?? ""} className={filterInput}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <label className="sr-only" htmlFor="f-cat">Category</label>
        <select id="f-cat" name="category" defaultValue={category ?? ""} className={filterInput}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className={filterButton}>Filter</button>
      </form>

      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full min-w-[960px] text-sm">
          <caption className="sr-only">Courses</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>Course</th>
              <th scope="col" className={th}>Category</th>
              <th scope="col" className={th}>Level</th>
              <th scope="col" className={th}>Price</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Enrollments</th>
              <th scope="col" className={th}>Revenue</th>
              <th scope="col" className={th}>Updated</th>
              <th scope="col" className={th}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-teal-50">
                      {c.thumbnailUrl && <Image src={c.thumbnailUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />}
                    </div>
                    <span className="max-w-[220px] truncate font-medium text-ink">{c.title}</span>
                  </div>
                </td>
                <td className={`${td} text-ink/80`}>{c.category.name}</td>
                <td className={`${td} text-ink/80`}>{levelLabel(c.level)}</td>
                <td className={`${td} text-ink/80`}>{c.isFree ? "Free" : formatKes(c.priceKes)}</td>
                <td className={td}><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
                <td className={`${td} text-ink/80`}>{c._count.enrollments}</td>
                <td className={`${td} text-ink/80`}>{formatKes(revenueBy.get(c.id) ?? 0)}</td>
                <td className={`${td} text-ink/70`}>{c.updatedAt.toLocaleDateString("en-KE")}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <Link href={`/admin/courses/${c.slug}`} className={linkBtn}>Edit</Link>
                    <Link href={`/courses/${c.slug}`} target="_blank" className={linkBtn}>Preview<span className="sr-only"> (new tab)</span></Link>
                    <ConfirmAction action={duplicateCourseAction.bind(null, c.id)}>Duplicate</ConfirmAction>
                    {c.status !== "PUBLISHED" && (
                      <ConfirmAction action={setCourseStatusAction.bind(null, c.id, "PUBLISHED")}>Publish</ConfirmAction>
                    )}
                    {c.status === "PUBLISHED" && (
                      <ConfirmAction action={setCourseStatusAction.bind(null, c.id, "DRAFT")}>Unpublish</ConfirmAction>
                    )}
                    {c.status !== "ARCHIVED" && (
                      <ConfirmAction action={setCourseStatusAction.bind(null, c.id, "ARCHIVED")}>Archive</ConfirmAction>
                    )}
                    <ConfirmAction
                      className={dangerBtn}
                      confirm={`Delete "${c.title}"? It disappears from the site; enrollments and payment records are kept.`}
                      action={deleteCourseAction.bind(null, c.id)}
                    >
                      Delete
                    </ConfirmAction>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/70">No courses match these filters.</p>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/courses" params={{ status, category, search }} />
    </div>
  );
}
