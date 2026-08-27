import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatKes, formatDate } from "@/lib/format";
import { addStudentNoteAction } from "@/lib/actions/admin/students";

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const student = await db.user.findUnique({
    where: { id },
    include: {
      enrollments: { include: { course: true }, orderBy: { enrolledAt: "desc" } },
      payments: { include: { course: true }, orderBy: { createdAt: "desc" } },
      adminNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!student) notFound();

  return (
    <div>
      <Link href="/admin/students" className="text-sm text-teal-700 hover:underline">
        ← All students
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-teal-900">{student.name}</h1>
          <p className="text-ink/60">{student.email}</p>
        </div>
        <span className="text-xs text-ink/40">Joined {formatDate(student.createdAt)}</span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-white p-6">
          <h2 className="font-serif text-lg text-teal-900">Enrollments</h2>
          <ul className="mt-3 divide-y divide-teal-50">
            {student.enrollments.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink">{e.course.title}</span>
                  <span className="text-ink/50">{e.progressPercent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-teal-50">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: `${e.progressPercent}%` }} />
                </div>
              </li>
            ))}
            {student.enrollments.length === 0 && <p className="py-3 text-sm text-ink/50">No enrollments yet.</p>}
          </ul>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-6">
          <h2 className="font-serif text-lg text-teal-900">Purchase history</h2>
          <ul className="mt-3 divide-y divide-teal-50">
            {student.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-ink">{p.course.title}</span>
                <span className="shrink-0 text-ink/50">{formatKes(p.amountKes)} · {p.status}</span>
              </li>
            ))}
            {student.payments.length === 0 && <p className="py-3 text-sm text-ink/50">No purchases yet.</p>}
          </ul>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-6">
          <h2 className="font-serif text-lg text-teal-900">Admin notes</h2>
          <form action={addStudentNoteAction.bind(null, student.id)} className="mt-3 flex gap-2">
            <input name="text" placeholder="Add a private note..." className="flex-1 rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
            <button type="submit" className="shrink-0 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Add
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {student.adminNotes.map((n) => (
              <li key={n.id} className="rounded-lg bg-teal-50/60 px-3 py-2 text-sm">
                <p className="text-ink/80">{n.text}</p>
                <p className="mt-1 text-xs text-ink/40">{n.author.name} · {formatDate(n.createdAt)}</p>
              </li>
            ))}
            {student.adminNotes.length === 0 && <p className="text-sm text-ink/50">No notes yet.</p>}
          </ul>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-6">
          <h2 className="font-serif text-lg text-teal-900">Activity log</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {student.activityLogs.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-ink/70">
                <span>{a.action.replace(/_/g, " ")}</span>
                <span className="text-xs text-ink/40">{formatDate(a.createdAt)}</span>
              </li>
            ))}
            {student.activityLogs.length === 0 && <p className="text-sm text-ink/50">No recorded activity yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
