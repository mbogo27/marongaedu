import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { hideReviewAction, unhideReviewAction, deleteReviewAction, flagReviewAction } from "@/lib/actions/admin/reviews";
import ReviewReplyForm from "@/components/admin/ReviewReplyForm";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { Badge, PageHeader, Pager, dangerBtn, filterButton, filterInput, statusTone } from "@/components/admin/ui";

const PER_PAGE = 20;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const where: Prisma.ReviewWhereInput = { deletedAt: null, ...(status === "PUBLISHED" || status === "HIDDEN" || status === "FLAGGED" ? { status } : {}) };
  const [total, reviews] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      include: { user: { select: { name: true } }, course: { select: { title: true } }, votes: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Reviews" />
      <form className="mt-4 flex gap-2" role="search" aria-label="Filter reviews">
        <label className="sr-only" htmlFor="r-status">Status</label>
        <select id="r-status" name="status" defaultValue={status ?? ""} className={filterInput}>
          <option value="">All</option>
          <option value="PUBLISHED">Published</option>
          <option value="HIDDEN">Hidden</option>
          <option value="FLAGGED">Flagged</option>
        </select>
        <button type="submit" className={filterButton}>Filter</button>
      </form>

      <ul className="mt-6 space-y-4">
        {reviews.map((r) => {
          const helpful = r.votes.filter((v) => v.helpful).length;
          return (
            <li key={r.id} className="rounded-2xl border border-teal-100 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">{r.user.name}</p>
                  <p className="text-xs text-ink/70">
                    {r.course.title} · {formatDate(r.createdAt)} · {helpful} helpful / {r.votes.length - helpful} not
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="warn">{r.rating}★</Badge>
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink/80">{r.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {r.status === "PUBLISHED" ? (
                  <ConfirmAction action={hideReviewAction.bind(null, r.id)}>Hide</ConfirmAction>
                ) : (
                  <ConfirmAction action={unhideReviewAction.bind(null, r.id)}>Unhide</ConfirmAction>
                )}
                {r.status !== "FLAGGED" && <ConfirmAction action={flagReviewAction.bind(null, r.id)}>Flag</ConfirmAction>}
                <ConfirmAction className={dangerBtn} confirm="Delete this review?" action={deleteReviewAction.bind(null, r.id)}>
                  Delete
                </ConfirmAction>
                <ReviewReplyForm reviewId={r.id} existingReply={r.instructorReply} />
              </div>
            </li>
          );
        })}
        {reviews.length === 0 && <li className="rounded-2xl border border-dashed border-teal-200 px-4 py-10 text-center text-sm text-ink/70">No reviews found.</li>}
      </ul>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/reviews" params={{ status }} />
    </div>
  );
}
