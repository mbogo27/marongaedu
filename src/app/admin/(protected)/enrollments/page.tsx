import { db } from "@/lib/db";
import { formatKes, formatDate } from "@/lib/format";
import { enrollmentWhere } from "@/lib/admin/filters";
import ManualEnrollForm from "@/components/admin/ManualEnrollForm";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { revokeAccessAction, restoreAccessAction } from "@/lib/actions/admin/students";
import { Badge, PageHeader, Pager, dangerBtn, filterButton, filterInput, statusTone, tableWrap, td, th } from "@/components/admin/ui";

const PER_PAGE = 25;

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; method?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = enrollmentWhere(sp);

  const [total, enrollments, courses] = await Promise.all([
    db.enrollment.count({ where }),
    db.enrollment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
        payments: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { enrolledAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.course.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();

  return (
    <div>
      <PageHeader
        title="Enrollments"
        actions={
          <a href={`/admin/enrollments/export${exportQs ? `?${exportQs}` : ""}`} className="rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">
            Export CSV
          </a>
        }
      />
      <div className="mt-4">
        <ManualEnrollForm courses={courses} />
      </div>
      <form className="mt-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter enrollments">
        <label className="text-xs text-ink/80">
          Course
          <select name="course" defaultValue={sp.course ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink/80">
          Payment method
          <select name="method" defaultValue={sp.method ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Any</option>
            <option value="MPESA">M-Pesa</option>
            <option value="CARD">Card</option>
            <option value="FREE">Free</option>
            <option value="MANUAL">Manual</option>
          </select>
        </label>
        <label className="text-xs text-ink/80">
          Status
          <select name="status" defaultValue={sp.status ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </label>
        <label className="text-xs text-ink/80">
          From
          <input type="date" name="from" defaultValue={sp.from} className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          To
          <input type="date" name="to" defaultValue={sp.to} className={`${filterInput} mt-1 block`} />
        </label>
        <button type="submit" className={filterButton}>Filter</button>
      </form>

      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full min-w-[1000px] text-sm">
          <caption className="sr-only">Enrollments</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>Student</th>
              <th scope="col" className={th}>Course</th>
              <th scope="col" className={th}>Enrolled</th>
              <th scope="col" className={th}>Progress</th>
              <th scope="col" className={th}>Completed</th>
              <th scope="col" className={th}>Method</th>
              <th scope="col" className={th}>Amount</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {enrollments.map((e) => (
              <tr key={e.id}>
                <td className={`${td} text-ink`}>{e.user.name}</td>
                <td className={`${td} text-ink/80`}>{e.course.title}</td>
                <td className={`${td} text-ink/70`}>{formatDate(e.enrolledAt)}</td>
                <td className={`${td} text-ink/80`}>{e.progressPercent}%</td>
                <td className={`${td} text-ink/70`}>{e.completedAt ? formatDate(e.completedAt) : "—"}</td>
                <td className={`${td} text-ink/80`}>{e.payments[0]?.method ?? e.source}</td>
                <td className={`${td} text-ink/80`}>{formatKes(e.payments[0]?.amountKes ?? 0)}</td>
                <td className={td}><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
                <td className={td}>
                  {e.status === "ACTIVE" ? (
                    <ConfirmAction className={dangerBtn} confirm="Revoke access? Progress is kept." action={revokeAccessAction.bind(null, e.id)}>Revoke</ConfirmAction>
                  ) : (
                    <ConfirmAction action={restoreAccessAction.bind(null, e.id)}>Restore</ConfirmAction>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {enrollments.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/70">No enrollments found.</p>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/enrollments" params={sp} />
    </div>
  );
}
