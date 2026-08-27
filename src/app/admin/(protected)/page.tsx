import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getAdminDashboardStats } from "@/lib/admin-queries";
import { formatKes, formatDate } from "@/lib/format";
import { RevenueChart, EnrollmentsChart } from "@/components/admin/AdminCharts";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const stats = await getAdminDashboardStats();

  const tiles = [
    { label: "Revenue (this month)", value: formatKes(stats.revenueThisMonth), hint: `${formatKes(stats.revenueAllTime)} all time` },
    { label: "Enrollments (this month)", value: stats.enrollmentsThisMonth.toString(), hint: `${stats.enrollmentsAllTime} all time` },
    { label: "Total students", value: stats.totalStudents.toString(), hint: "registered learners" },
    { label: "Courses", value: `${stats.totalCoursesPublished} published`, hint: `${stats.totalCoursesDraft} draft` },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Welcome back, {admin.name}</h1>
      <p className="text-ink/60">Here&apos;s how {"Maronga Dental Academy"} is doing.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-ink/50">{tile.label}</p>
            <p className="mt-2 font-serif text-2xl text-teal-900">{tile.value}</p>
            <p className="mt-1 text-xs text-ink/40">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg text-teal-900">Revenue — last 12 months</h2>
          <RevenueChart data={stats.revenueByMonth} />
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg text-teal-900">Enrollments — last 30 days</h2>
          <EnrollmentsChart data={stats.enrollmentsByDay} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg text-teal-900">Top courses by revenue</h2>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.topByRevenue.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-ink">{c.title}</span>
                <span className="shrink-0 font-medium text-teal-700">{formatKes(c.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg text-teal-900">Top courses by enrollments</h2>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.topByEnrollments.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-ink">{c.title}</span>
                <span className="shrink-0 font-medium text-teal-700">{c.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-teal-900">Recent enrollments</h2>
            <Link href="/admin/enrollments" className="text-sm font-medium text-teal-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.recentEnrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{e.user.name}</p>
                  <p className="truncate text-ink/50">{e.course.title}</p>
                </div>
                <span className="shrink-0 text-xs text-ink/40">{formatDate(e.enrolledAt)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-teal-900">Recent signups</h2>
            <Link href="/admin/students" className="text-sm font-medium text-teal-600 hover:underline">
              View all students →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.recentSignups.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <p className="truncate font-medium text-ink">{s.name}</p>
                <span className="shrink-0 text-xs text-ink/40">{formatDate(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg text-teal-900">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/admin/courses/new" className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50">
            Add a new course <span aria-hidden>→</span>
          </Link>
          <Link href="/admin/coupons" className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50">
            Create a coupon <span aria-hidden>→</span>
          </Link>
          <Link href="/admin/students" className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50">
            See who&apos;s enrolled <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
