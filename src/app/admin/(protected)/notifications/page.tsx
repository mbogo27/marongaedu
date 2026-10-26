import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { markNotificationReadAction } from "@/lib/actions/admin/messages";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { PageHeader, Pager } from "@/components/admin/ui";

const TYPE_LABEL: Record<string, string> = {
  signup: "New signup",
  email_verified: "Email verified",
  enrollment: "New enrollment",
  payment_received: "Payment received",
  payment_failed: "Payment failed",
  refund: "Refund processed",
  review: "New review",
  contact_submission: "Contact form submission",
  course_completed: "Course completed",
  certificate_issued: "Certificate issued",
  email: "Email (console provider)",
  email_failed: "Email delivery failed",
  security: "Security event",
};
const PER_PAGE = 50;

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const { page: pageParam, type } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const where = type ? { type } : {};
  const [total, notifications, types] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.notification.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Notifications" />
      <p className="mt-1 text-sm text-ink/70">Platform events: signups, enrollments, payments, reviews, messages and email deliveries.</p>

      <form className="mt-4 flex gap-2" role="search" aria-label="Filter notifications">
        <label className="sr-only" htmlFor="n-type">Type</label>
        <select id="n-type" name="type" defaultValue={type ?? ""} className="rounded-lg border border-teal-200 px-3 py-2 text-sm">
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.type} value={t.type}>
              {TYPE_LABEL[t.type] ?? t.type} ({t._count._all})
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-teal-100 px-4 py-2 text-sm font-medium text-teal-900">Filter</button>
      </form>

      <ul className="mt-6 divide-y divide-teal-50 rounded-2xl border border-teal-100 bg-white">
        {notifications.map((n) => {
          const payload = (n.payload ?? {}) as Record<string, unknown>;
          const isEmail = n.type === "email";
          return (
            <li key={n.id} className={`px-5 py-3 text-sm ${n.readAt ? "" : "bg-gold-50/50"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {TYPE_LABEL[n.type] ?? n.type}
                    {isEmail && <span className="ml-2 font-normal text-ink/80">→ {String(payload.to)} · {String(payload.subject)}</span>}
                  </p>
                  {!isEmail && <p className="truncate text-xs text-ink/70">{JSON.stringify(payload)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <time className="text-xs text-ink/70" dateTime={n.createdAt.toISOString()}>{formatDate(n.createdAt)}</time>
                  {!n.readAt && <ConfirmAction action={markNotificationReadAction.bind(null, n.id)}>Mark read</ConfirmAction>}
                </div>
              </div>
              {isEmail && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-teal-800">Show message</summary>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-teal-50/60 p-3 text-xs text-ink/80">{String(payload.body)}</pre>
                </details>
              )}
            </li>
          );
        })}
        {notifications.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink/70">No notifications yet.</li>}
      </ul>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/notifications" params={{ type }} />
    </div>
  );
}
