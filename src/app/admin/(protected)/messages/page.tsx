import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { markMessageReadAction, markMessageRepliedAction } from "@/lib/actions/admin/messages";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { Badge, PageHeader, Pager } from "@/components/admin/ui";

const PER_PAGE = 25;

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [total, submissions] = await Promise.all([
    db.contactSubmission.count(),
    db.contactSubmission.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);

  return (
    <div>
      <PageHeader title="Messages" />
      <ul className="mt-6 space-y-4">
        {submissions.map((m) => (
          <li key={m.id} className="rounded-2xl border border-teal-100 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{m.subject}</p>
                <p className="text-xs text-ink/70">
                  {m.name} ({m.email}) · {formatDate(m.createdAt)}
                </p>
              </div>
              <Badge tone={m.status === "NEW" ? "warn" : m.status === "READ" ? "good" : "muted"}>{m.status}</Badge>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-ink/80">{m.message}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {m.status === "NEW" && <ConfirmAction action={markMessageReadAction.bind(null, m.id)}>Mark as read</ConfirmAction>}
              {m.status !== "REPLIED" && <ConfirmAction action={markMessageRepliedAction.bind(null, m.id)}>Mark as replied</ConfirmAction>}
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline">
                Reply by email
              </a>
            </div>
          </li>
        ))}
        {submissions.length === 0 && <li className="rounded-2xl border border-dashed border-teal-200 px-4 py-10 text-center text-sm text-ink/70">No messages yet.</li>}
      </ul>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/messages" params={{}} />
    </div>
  );
}
