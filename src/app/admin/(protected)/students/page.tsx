import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { suspendStudentAction, unsuspendStudentAction, deleteStudentAction } from "@/lib/actions/admin/students";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { Badge, PageHeader, Pager, dangerBtn, filterButton, filterInput, linkBtn, statusTone, tableWrap, td, th } from "@/components/admin/ui";
import type { Prisma } from "@prisma/client";

const PER_PAGE = 25;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; from?: string; to?: string; enrolled?: string; status?: string; page?: string }>;
}) {
  const { search, from, to, enrolled, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.UserWhereInput = {
    role: "LEARNER",
    deletedAt: null,
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(new Date(to).getTime() + 86_399_999) } : {}) } }
      : {}),
    ...(enrolled === "yes" ? { enrollments: { some: { status: "ACTIVE" } } } : enrolled === "no" ? { enrollments: { none: { status: "ACTIVE" } } } : {}),
    ...(status === "ACTIVE" || status === "SUSPENDED" ? { status } : {}),
  };

  const [total, students] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } }, sessions: { orderBy: { lastActiveAt: "desc" }, take: 1, select: { lastActiveAt: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Students" />
      <form className="mt-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter students">
        <label className="text-xs text-ink/80">
          Search
          <input name="search" defaultValue={search} placeholder="Name or email…" className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          Signed up from
          <input type="date" name="from" defaultValue={from} className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          to
          <input type="date" name="to" defaultValue={to} className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          Enrollment
          <select name="enrolled" defaultValue={enrolled ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Any</option>
            <option value="yes">Has enrollments</option>
            <option value="no">No enrollments</option>
          </select>
        </label>
        <label className="text-xs text-ink/80">
          Status
          <select name="status" defaultValue={status ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        <button type="submit" className={filterButton}>Filter</button>
      </form>

      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Students</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>Student</th>
              <th scope="col" className={th}>Email</th>
              <th scope="col" className={th}>Signed up</th>
              <th scope="col" className={th}>Last active</th>
              <th scope="col" className={th}>Courses</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {students.map((s) => (
              <tr key={s.id}>
                <td className={`${td} font-medium text-ink`}>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-700 text-xs font-semibold text-white" aria-hidden="true">
                      {s.avatarUrl ? <Image src={s.avatarUrl} alt="" fill sizes="32px" className="object-cover" unoptimized /> : s.name.charAt(0).toUpperCase()}
                    </span>
                    <Link href={`/admin/students/${s.id}`} className="hover:underline">{s.name}</Link>
                  </div>
                </td>
                <td className={`${td} text-ink/80`}>
                  {s.email} {!s.emailVerifiedAt && <Badge tone="warn">unverified</Badge>}
                </td>
                <td className={`${td} text-ink/70`}>{formatDate(s.createdAt)}</td>
                <td className={`${td} text-ink/70`}>{s.sessions[0] ? formatDate(s.sessions[0].lastActiveAt) : s.lastLoginAt ? formatDate(s.lastLoginAt) : "—"}</td>
                <td className={`${td} text-ink/80`}>{s._count.enrollments}</td>
                <td className={td}><Badge tone={statusTone(s.status)}>{s.status === "ACTIVE" ? "Active" : "Suspended"}</Badge></td>
                <td className={td}>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <Link href={`/admin/students/${s.id}`} className={linkBtn}>View</Link>
                    <a href={`mailto:${s.email}`} className={linkBtn}>Message</a>
                    {s.status === "ACTIVE" ? (
                      <ConfirmAction confirm={`Suspend ${s.name}? They are signed out immediately and cannot log in.`} action={suspendStudentAction.bind(null, s.id)}>Suspend</ConfirmAction>
                    ) : (
                      <ConfirmAction action={unsuspendStudentAction.bind(null, s.id)}>Unsuspend</ConfirmAction>
                    )}
                    <ConfirmAction className={dangerBtn} confirm={`Delete ${s.name}? Their profile is anonymised; purchase records are kept.`} action={deleteStudentAction.bind(null, s.id)}>Delete</ConfirmAction>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/70">No students match.</p>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/students" params={{ search, from, to, enrolled, status }} />
    </div>
  );
}
