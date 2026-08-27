import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { markNotificationReadAction } from "@/lib/actions/admin/messages";

const TYPE_LABEL: Record<string, string> = {
  signup: "New signup",
  enrollment: "New enrollment",
  payment_received: "Payment received",
  payment_failed: "Payment failed",
  review: "New review",
  contact_submission: "Contact form submission",
  course_completed: "Course completed",
  certificate_issued: "Certificate issued",
  email: "Email sent (stub)",
};

export default async function AdminNotificationsPage() {
  const notifications = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Notifications</h1>
      <p className="mt-1 text-sm text-ink/60">A live feed of stub system events — signups, enrollments, payments, reviews, and more.</p>

      <div className="mt-6 divide-y divide-teal-50 rounded-2xl border border-teal-100 bg-white">
        {notifications.map((n) => {
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(n.payload);
          } catch {
            // ignore
          }
          return (
            <div key={n.id} className={`flex items-center justify-between gap-4 px-5 py-3 text-sm ${n.readAt ? "" : "bg-gold-50/40"}`}>
              <div className="min-w-0">
                <p className="font-medium text-ink">{TYPE_LABEL[n.type] ?? n.type}</p>
                <p className="truncate text-xs text-ink/50">{JSON.stringify(payload)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-ink/40">{formatDate(n.createdAt)}</span>
                {!n.readAt && (
                  <form action={markNotificationReadAction.bind(null, n.id)}>
                    <button type="submit" className="text-xs font-medium text-teal-700 hover:underline">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink/50">No notifications yet.</p>}
      </div>
    </div>
  );
}
