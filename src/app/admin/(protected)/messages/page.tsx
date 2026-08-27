import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { markMessageReadAction, markMessageRepliedAction } from "@/lib/actions/admin/messages";

export default async function AdminMessagesPage() {
  const submissions = await db.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Messages</h1>
      <div className="mt-6 space-y-4">
        {submissions.map((m) => (
          <div key={m.id} className="rounded-2xl border border-teal-100 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{m.subject}</p>
                <p className="text-xs text-ink/50">
                  {m.name} ({m.email}) · {formatDate(m.createdAt)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.status === "NEW" ? "bg-gold-50 text-gold-700" : m.status === "READ" ? "bg-teal-50 text-teal-700" : "bg-ink/5 text-ink/50"
                }`}
              >
                {m.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink/80">{m.message}</p>
            <div className="mt-3 flex gap-4">
              {m.status === "NEW" && (
                <form action={markMessageReadAction.bind(null, m.id)}>
                  <button type="submit" className="text-xs font-medium text-teal-700 hover:underline">
                    Mark as read
                  </button>
                </form>
              )}
              {m.status !== "REPLIED" && (
                <form action={markMessageRepliedAction.bind(null, m.id)}>
                  <button type="submit" className="text-xs font-medium text-teal-700 hover:underline">
                    Mark as replied
                  </button>
                </form>
              )}
              <a href={`mailto:${m.email}`} className="text-xs font-medium text-ink/50 hover:underline">
                Reply by email
              </a>
            </div>
          </div>
        ))}
        {submissions.length === 0 && <p className="rounded-2xl border border-dashed border-teal-200 px-4 py-10 text-center text-sm text-ink/50">No messages yet.</p>}
      </div>
    </div>
  );
}
