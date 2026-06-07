import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { adminStats, formatKes, instructor } from "@/lib/data";

const tiles = [
  { label: "Total courses", value: adminStats.totalCourses.toString(), hint: `${adminStats.publishedCourses} published` },
  { label: "Total enrollments", value: adminStats.totalEnrollments.toLocaleString("en-KE"), hint: "across all courses" },
  { label: "Revenue (lifetime)", value: formatKes(adminStats.revenueKes), hint: "mock figure for demo" },
];

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl text-teal-900">Welcome back, {instructor.name.replace("Dr. ", "Dr. ")}</h1>
        <p className="text-ink/60">Here&apos;s how Maronga Dental Academy is doing.</p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-ink/50">{tile.label}</p>
            <p className="mt-2 font-serif text-3xl text-teal-900">{tile.value}</p>
            <p className="mt-1 text-xs text-ink/40">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-teal-900">Recent signups</h2>
            <Link href="/admin/students" className="text-sm font-medium text-teal-600 hover:underline">
              View all students →
            </Link>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-teal-100">
            {adminStats.recentSignups.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-ink/50">{s.course}</p>
                </div>
                <span className="shrink-0 text-xs text-ink/40">
                  {new Date(s.enrolledOn).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg text-teal-900">Quick actions</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/admin/courses/new"
              className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50"
            >
              Add a new course
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/admin/courses"
              className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50"
            >
              Review course list & status
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50"
            >
              See who&apos;s enrolled
              <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink/40">
            Demo build — figures above are mock data for illustration.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
