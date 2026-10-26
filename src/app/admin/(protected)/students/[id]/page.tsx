import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatKes } from "@/lib/format";
import {
  addStudentNoteAction,
  resendVerificationForAction,
  restoreAccessAction,
  revokeAccessAction,
  sendPasswordResetForAction,
  suspendStudentAction,
  unsuspendStudentAction,
} from "@/lib/actions/admin/students";
import { refundPaymentAction } from "@/lib/actions/admin/payments";
import ConfirmAction from "@/components/admin/ConfirmAction";
import ManualEnrollForm from "@/components/admin/ManualEnrollForm";
import { Badge, dangerBtn, linkBtn, statusTone } from "@/components/admin/ui";

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const student = await db.user.findFirst({
    where: { id },
    include: {
      enrollments: {
        include: {
          course: { include: { modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } } } } } },
          lessonProgress: true,
          quizAttempts: { orderBy: { createdAt: "desc" }, include: { lesson: { select: { title: true } } } },
        },
        orderBy: { enrolledAt: "desc" },
      },
      payments: { include: { course: true }, orderBy: { createdAt: "desc" } },
      adminNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!student) notFound();

  const [audit, courses] = await Promise.all([
    db.auditLog.findMany({ where: { OR: [{ targetId: id }, { actorId: id }] }, orderBy: { createdAt: "desc" }, take: 40 }),
    db.course.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const isLearner = student.role === "LEARNER";

  return (
    <div>
      <Link href="/admin/students" className="text-sm text-teal-800 underline-offset-2 hover:underline">← All students</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-teal-900">{student.name}</h1>
          <p className="text-ink/80">{student.email}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/70">
            <Badge tone={statusTone(student.status)}>{student.status}</Badge>
            <Badge tone={student.emailVerifiedAt ? "good" : "warn"}>{student.emailVerifiedAt ? "Email verified" : "Email not verified"}</Badge>
            <span>Joined {formatDate(student.createdAt)}</span>
            {student.lastLoginAt && <span>Last login {formatDate(student.lastLoginAt)}</span>}
          </p>
        </div>
        {isLearner && !student.deletedAt && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-100 bg-white px-4 py-3">
            {!student.emailVerifiedAt && <ConfirmAction action={resendVerificationForAction.bind(null, student.id)}>Resend verification</ConfirmAction>}
            <ConfirmAction action={sendPasswordResetForAction.bind(null, student.id)}>Send password reset</ConfirmAction>
            {student.status === "ACTIVE" ? (
              <ConfirmAction className={dangerBtn} confirm="Suspend this student?" action={suspendStudentAction.bind(null, student.id)}>Suspend</ConfirmAction>
            ) : (
              <ConfirmAction action={unsuspendStudentAction.bind(null, student.id)}>Unsuspend</ConfirmAction>
            )}
          </div>
        )}
      </div>

      {isLearner && !student.deletedAt && (
        <div className="mt-6">
          <ManualEnrollForm courses={courses} presetEmail={student.email} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="enr-h" className="rounded-2xl border border-teal-100 bg-white p-6 lg:col-span-2">
          <h2 id="enr-h" className="font-serif text-lg text-teal-900">Enrollments &amp; progress</h2>
          <ul className="mt-3 divide-y divide-teal-50">
            {student.enrollments.map((e) => {
              const done = new Set(e.lessonProgress.filter((p) => p.completed).map((p) => p.lessonId));
              return (
                <li key={e.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-ink">{e.course.title}</span>
                    <span className="flex items-center gap-3">
                      <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                      <span className="text-ink/80">{e.progressPercent}%</span>
                      {e.status === "ACTIVE" ? (
                        <ConfirmAction className={dangerBtn} confirm="Revoke this student's access to the course? Their progress is kept." action={revokeAccessAction.bind(null, e.id)}>Revoke access</ConfirmAction>
                      ) : (
                        <ConfirmAction action={restoreAccessAction.bind(null, e.id)}>Restore access</ConfirmAction>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-teal-50" role="progressbar" aria-valuenow={e.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${e.course.title} progress`}>
                    <div className="h-full rounded-full bg-teal-700" style={{ width: `${e.progressPercent}%` }} />
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-teal-800">Lesson-by-lesson progress &amp; quiz attempts</summary>
                    <div className="mt-2 grid gap-4 sm:grid-cols-2">
                      <ul className="space-y-1 text-xs">
                        {e.course.modules.flatMap((m) => m.lessons).map((l) => {
                          const p = e.lessonProgress.find((x) => x.lessonId === l.id);
                          return (
                            <li key={l.id} className="flex justify-between gap-2 text-ink/80">
                              <span className="truncate">{done.has(l.id) ? "✓" : "○"} {l.title}</span>
                              {p && p.lastPositionSeconds > 0 && <span className="shrink-0 text-ink/70">{Math.floor(p.lastPositionSeconds / 60)}m watched</span>}
                            </li>
                          );
                        })}
                      </ul>
                      <ul className="space-y-1 text-xs">
                        {e.quizAttempts.slice(0, 10).map((q) => (
                          <li key={q.id} className="flex justify-between gap-2 text-ink/80">
                            <span className="truncate">{q.lesson.title}</span>
                            <span className={q.passed ? "text-teal-800" : "text-red-700"}>{q.scorePercent}% · {formatDate(q.createdAt)}</span>
                          </li>
                        ))}
                        {e.quizAttempts.length === 0 && <li className="text-ink/70">No quiz attempts.</li>}
                      </ul>
                    </div>
                  </details>
                </li>
              );
            })}
            {student.enrollments.length === 0 && <li className="py-3 text-sm text-ink/70">No enrollments yet.</li>}
          </ul>
        </section>

        <section aria-labelledby="pay-h" className="rounded-2xl border border-teal-100 bg-white p-6">
          <h2 id="pay-h" className="font-serif text-lg text-teal-900">Purchase history</h2>
          <ul className="mt-3 divide-y divide-teal-50">
            {student.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 truncate text-ink">{p.course.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-ink/80">
                  {formatKes(p.amountKes)} <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  {p.status === "SUCCESS" && p.amountKes > 0 && (
                    <ConfirmAction className={dangerBtn} confirm={`Refund ${formatKes(p.amountKes)} and revoke access?`} action={refundPaymentAction.bind(null, p.id)}>Refund</ConfirmAction>
                  )}
                </span>
              </li>
            ))}
            {student.payments.length === 0 && <li className="py-3 text-sm text-ink/70">No purchases yet.</li>}
          </ul>
        </section>

        <section aria-labelledby="notes-h" className="rounded-2xl border border-teal-100 bg-white p-6">
          <h2 id="notes-h" className="font-serif text-lg text-teal-900">Admin notes</h2>
          <form action={addStudentNoteAction.bind(null, student.id)} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="admin-note">Private note</label>
            <input id="admin-note" name="text" maxLength={2000} placeholder="Add a private note…" className="flex-1 rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            <button type="submit" className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">Add</button>
          </form>
          <ul className="mt-3 space-y-2">
            {student.adminNotes.map((n) => (
              <li key={n.id} className="rounded-lg bg-teal-50/60 px-3 py-2 text-sm">
                <p className="text-ink/80">{n.text}</p>
                <p className="mt-1 text-xs text-ink/70">{n.author.name} · {formatDate(n.createdAt)}</p>
              </li>
            ))}
            {student.adminNotes.length === 0 && <li className="text-sm text-ink/70">No notes yet.</li>}
          </ul>
        </section>

        <section aria-labelledby="audit-h" className="rounded-2xl border border-teal-100 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="audit-h" className="font-serif text-lg text-teal-900">Audit trail</h2>
            <Link href={`/admin/audit?target=${student.id}`} className={linkBtn}>Open in audit log →</Link>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-ink/80">
                <span className="font-mono text-xs">{a.action}</span>
                <span className="text-xs text-ink/70">{a.ip ?? ""} · {a.createdAt.toLocaleString("en-KE")}</span>
              </li>
            ))}
            {audit.length === 0 && <li className="text-ink/70">No recorded events.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
