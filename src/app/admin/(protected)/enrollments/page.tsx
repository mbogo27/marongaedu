import { db } from "@/lib/db";
import { formatKes, formatDate } from "@/lib/format";
import ManualEnrollForm from "@/components/admin/ManualEnrollForm";

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; method?: string }>;
}) {
  const { course, method } = await searchParams;

  const [enrollments, courses] = await Promise.all([
    db.enrollment.findMany({
      where: course ? { courseId: course } : {},
      include: { user: true, course: true, payment: true },
      orderBy: { enrolledAt: "desc" },
    }),
    db.course.findMany({ orderBy: { title: "asc" } }),
  ]);

  const filtered = method ? enrollments.filter((e) => e.payment?.method === method) : enrollments;

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Enrollments</h1>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <ManualEnrollForm courses={courses} />
        <div className="flex items-center gap-3">
          <form className="flex gap-2">
            <select name="course" defaultValue={course ?? ""} className="rounded-lg border border-teal-100 px-3 py-2 text-sm">
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-teal-100 px-4 py-2 text-sm font-medium text-teal-700">
              Filter
            </button>
          </form>
          <a href="/admin/enrollments/export" className="rounded-full border border-teal-100 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
            Export CSV
          </a>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-teal-100 text-left text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Enrolled</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-ink">{e.user.name}</td>
                <td className="px-4 py-3 text-ink/70">{e.course.title}</td>
                <td className="px-4 py-3 text-ink/40">{formatDate(e.enrolledAt)}</td>
                <td className="px-4 py-3 text-ink/60">{e.progressPercent}%</td>
                <td className="px-4 py-3 text-ink/40">{e.completedAt ? formatDate(e.completedAt) : "—"}</td>
                <td className="px-4 py-3 text-ink/60">{e.payment?.method ?? e.source}</td>
                <td className="px-4 py-3 text-ink/60">{formatKes(e.payment?.amountKes ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/50">No enrollments found.</p>}
      </div>
    </div>
  );
}
