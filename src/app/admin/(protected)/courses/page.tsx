import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatKes } from "@/lib/format";
import { levelLabel } from "@/lib/content-types";
import { duplicateCourseAction, archiveCourseAction, publishCourseAction, deleteCourseAction } from "@/lib/actions/admin/courses";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string }>;
}) {
  const { status, category, search } = await searchParams;

  const [courses, categories] = await Promise.all([
    db.course.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(category ? { categoryId: category } : {}),
        ...(search ? { title: { contains: search } } : {}),
      },
      include: {
        category: true,
        payments: { where: { status: "SUCCESS" }, select: { amountKes: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl text-teal-900">Courses</h1>
        <Link href="/admin/courses/new" className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
          + New course
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3">
        <input name="search" defaultValue={search} placeholder="Search by title..." className="rounded-lg border border-teal-100 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-teal-100 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select name="category" defaultValue={category ?? ""} className="rounded-lg border border-teal-100 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-teal-100 px-4 py-2 text-sm font-medium text-teal-700">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-teal-100 text-left text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Enrollments</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {courses.map((c) => {
              const revenue = c.payments.reduce((s, p) => s + p.amountKes, 0);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-teal-50">
                        <Image src={c.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                      </div>
                      <span className="max-w-[220px] truncate font-medium text-ink">{c.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{c.category.name}</td>
                  <td className="px-4 py-3 text-ink/60">{levelLabel(c.level)}</td>
                  <td className="px-4 py-3 text-ink/60">{c.isFree ? "Free" : formatKes(c.priceKes)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "PUBLISHED" ? "bg-teal-50 text-teal-700" : c.status === "DRAFT" ? "bg-gold-50 text-gold-700" : "bg-ink/5 text-ink/50"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{c._count.enrollments}</td>
                  <td className="px-4 py-3 text-ink/60">{formatKes(revenue)}</td>
                  <td className="px-4 py-3 text-ink/40">{c.updatedAt.toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link href={`/admin/courses/${c.slug}`} className="font-medium text-teal-700 hover:underline">
                        Edit
                      </Link>
                      <Link href={`/courses/${c.slug}`} target="_blank" className="font-medium text-ink/50 hover:underline">
                        Preview
                      </Link>
                      <form action={duplicateCourseAction.bind(null, c.id)}>
                        <button type="submit" className="font-medium text-ink/50 hover:underline">
                          Duplicate
                        </button>
                      </form>
                      {c.status !== "PUBLISHED" && (
                        <form action={publishCourseAction.bind(null, c.id)}>
                          <button type="submit" className="font-medium text-teal-700 hover:underline">
                            Publish
                          </button>
                        </form>
                      )}
                      {c.status !== "ARCHIVED" && (
                        <form action={archiveCourseAction.bind(null, c.id)}>
                          <button type="submit" className="font-medium text-ink/50 hover:underline">
                            Archive
                          </button>
                        </form>
                      )}
                      <form action={deleteCourseAction.bind(null, c.id)}>
                        <button type="submit" className="font-medium text-red-500 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {courses.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/50">No courses match these filters.</p>}
      </div>
    </div>
  );
}
