import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { suspendStudentAction, unsuspendStudentAction, deleteStudentAction } from "@/lib/actions/admin/students";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  const students = await db.user.findMany({
    where: {
      role: "LEARNER",
      deletedAt: null,
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Students</h1>
      <form className="mt-4">
        <input name="search" defaultValue={search} placeholder="Search by name or email..." className="w-full max-w-sm rounded-lg border border-teal-100 px-3 py-2 text-sm" />
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-teal-100 text-left text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3 font-medium">Enrollments</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-ink">
                  <Link href={`/admin/students/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink/60">{s.email}</td>
                <td className="px-4 py-3 text-ink/40">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3 text-ink/60">{s._count.enrollments}</td>
                <td className="px-4 py-3">
                  {s.suspendedAt ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Suspended</span>
                  ) : (
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-xs">
                    <Link href={`/admin/students/${s.id}`} className="font-medium text-teal-700 hover:underline">
                      View
                    </Link>
                    {s.suspendedAt ? (
                      <form action={unsuspendStudentAction.bind(null, s.id)}>
                        <button type="submit" className="font-medium text-ink/50 hover:underline">
                          Unsuspend
                        </button>
                      </form>
                    ) : (
                      <form action={suspendStudentAction.bind(null, s.id)}>
                        <button type="submit" className="font-medium text-ink/50 hover:underline">
                          Suspend
                        </button>
                      </form>
                    )}
                    <form action={deleteStudentAction.bind(null, s.id)}>
                      <button type="submit" className="font-medium text-red-500 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
