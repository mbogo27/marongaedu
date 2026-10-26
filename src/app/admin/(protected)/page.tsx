import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getAdminDashboardStats, resolveRange } from "@/lib/admin-queries";
import { formatKes, formatDate } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { RevenueChart, EnrollmentsChart } from "@/components/admin/AdminCharts";

const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "12m", label: "12 months" },
] as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range: rangeParam, from, to } = await searchParams;
  const admin = await requireAdmin();
  const range = resolveRange(rangeParam, from, to);
  const [stats, general] = await Promise.all([getAdminDashboardStats(range), getSetting("general")]);

  const tiles = [
    { label: `Revenue (${range.label.toLowerCase()})`, value: formatKes(stats.revenueInRange), hint: `${formatKes(stats.revenueAllTime)} all time` },
    { label: `Enrollments (${range.label.toLowerCase()})`, value: stats.enrollmentsInRange.toString(), hint: `${stats.enrollmentsAllTime} active all time` },
    { label: "Total students", value: stats.totalStudents.toString(), hint: `${stats.newStudents} new in range` },
    { label: "Courses", value: `${stats.totalCoursesPublished} published`, hint: `${stats.totalCoursesDraft} draft` },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-teal-900">Welcome back, {admin.name}</h1>
          <p className="text-ink/70">Here&apos;s how {general.siteName} is doing.</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2 text-sm" aria-label="Date range">
          <div role="group" aria-label="Preset ranges" className="flex rounded-full bg-teal-50 p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/admin?range=${r.key}`}
                aria-current={range.key === r.key ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 font-medium ${range.key === r.key ? "bg-white text-teal-900 shadow-sm" : "text-ink/80 hover:text-ink"}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <input type="hidden" name="range" value="custom" />
          <label className="text-xs text-ink/80">
            From
            <input type="date" name="from" defaultValue={rangeParam === "custom" ? from : undefined} required className="ml-1 rounded-lg border border-teal-200 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-ink/80">
            To
            <input type="date" name="to" defaultValue={rangeParam === "custom" ? to : undefined} required className="ml-1 rounded-lg border border-teal-200 px-2 py-1.5 text-sm" />
          </label>
          <button type="submit" className={`rounded-full px-4 py-1.5 font-medium ${range.key === "custom" ? "bg-teal-700 text-white" : "border border-teal-300 text-teal-800 hover:bg-teal-50"}`}>
            Apply
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-ink/70">{tile.label}</p>
            <p className="mt-2 font-serif text-2xl text-teal-900">{tile.value}</p>
            <p className="mt-1 text-xs text-ink/70">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="rev-h" className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 id="rev-h" className="font-serif text-lg text-teal-900">Revenue — {range.label.toLowerCase()}</h2>
          <RevenueChart data={stats.revenueSeries} />
        </section>
        <section aria-labelledby="enr-h" className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 id="enr-h" className="font-serif text-lg text-teal-900">Enrollments — {range.label.toLowerCase()}</h2>
          <EnrollmentsChart data={stats.enrollmentSeries} />
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-rev-h" className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 id="top-rev-h" className="font-serif text-lg text-teal-900">Top courses by revenue</h2>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.topByRevenue.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-ink">{c.title}</span>
                <span className="shrink-0 font-medium text-teal-800">{formatKes(c.value)}</span>
              </li>
            ))}
            {stats.topByRevenue.length === 0 && <li className="py-2 text-sm text-ink/70">No sales in this range.</li>}
          </ul>
        </section>
        <section aria-labelledby="top-enr-h" className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 id="top-enr-h" className="font-serif text-lg text-teal-900">Top courses by enrollments</h2>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.topByEnrollments.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-ink">{c.title}</span>
                <span className="shrink-0 font-medium text-teal-800">{c.value}</span>
              </li>
            ))}
            {stats.topByEnrollments.length === 0 && <li className="py-2 text-sm text-ink/70">No enrollments in this range.</li>}
          </ul>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="rec-enr-h" className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 id="rec-enr-h" className="font-serif text-lg text-teal-900">Recent enrollments</h2>
            <Link href="/admin/enrollments" className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.recentEnrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{e.user.name}</p>
                  <p className="truncate text-ink/70">{e.course.title}</p>
                </div>
                <span className="shrink-0 text-xs text-ink/70">{formatDate(e.enrolledAt)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="rec-sig-h" className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 id="rec-sig-h" className="font-serif text-lg text-teal-900">Recent signups</h2>
            <Link href="/admin/students" className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
              View all students →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-teal-50">
            {stats.recentSignups.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <p className="truncate font-medium text-ink">{s.name}</p>
                <span className="shrink-0 text-xs text-ink/70">{formatDate(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="qa-h" className="mt-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <h2 id="qa-h" className="font-serif text-lg text-teal-900">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/courses/new", label: "Add a new course" },
            { href: "/admin/coupons", label: "Create a coupon" },
            { href: "/admin/students", label: "See who's enrolled" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center justify-between rounded-xl border border-teal-100 px-4 py-3 text-sm font-medium text-ink/80 transition hover:border-teal-300 hover:bg-teal-50">
              {a.label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
