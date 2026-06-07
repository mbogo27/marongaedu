import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { courses, formatKes } from "@/lib/data";

export default function AdminCoursesPage() {
  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-teal-900">Courses</h1>
          <p className="text-ink/60">Everything you&apos;ve published — and what&apos;s still in draft.</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-gold-400"
        >
          + New course
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-teal-50/70 text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Enrollments</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-100">
            {courses.map((course) => (
              <tr key={course.slug} className="transition hover:bg-teal-50/40">
                <td className="px-5 py-4">
                  <p className="font-medium text-ink">{course.title}</p>
                  <p className="text-xs text-ink/50">{course.category} · {course.level} · {course.durationLabel}</p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      course.status === "Published"
                        ? "bg-teal-50 text-teal-700"
                        : "bg-gold-300/40 text-gold-600"
                    }`}
                  >
                    {course.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-ink/70">{course.enrollments.toLocaleString("en-KE")}</td>
                <td className="px-5 py-4 text-ink/70">{formatKes(course.priceKes)}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/courses/${course.slug}`}
                    className="rounded-full border border-teal-100 px-4 py-1.5 text-sm font-medium text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
