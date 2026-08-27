import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { hideReviewAction, unhideReviewAction, deleteReviewAction } from "@/lib/actions/admin/reviews";
import ReviewReplyForm from "@/components/admin/ReviewReplyForm";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const reviews = await db.review.findMany({
    where: status ? { status: status as never } : {},
    include: { user: true, course: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Reviews</h1>
      <form className="mt-4">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-teal-100 px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="PUBLISHED">Published</option>
          <option value="HIDDEN">Hidden</option>
          <option value="FLAGGED">Flagged</option>
        </select>
      </form>

      <div className="mt-6 space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-teal-100 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{r.user.name}</p>
                <p className="text-xs text-ink/50">{r.course.title} · {formatDate(r.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-700">{r.rating}★</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "PUBLISHED" ? "bg-teal-50 text-teal-700" : "bg-ink/5 text-ink/50"}`}>{r.status}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/80">{r.text}</p>
            <div className="mt-3 flex items-center gap-4">
              {r.status === "PUBLISHED" ? (
                <form action={hideReviewAction.bind(null, r.id)}>
                  <button type="submit" className="text-xs font-medium text-ink/50 hover:underline">
                    Hide
                  </button>
                </form>
              ) : (
                <form action={unhideReviewAction.bind(null, r.id)}>
                  <button type="submit" className="text-xs font-medium text-teal-700 hover:underline">
                    Unhide
                  </button>
                </form>
              )}
              <form action={deleteReviewAction.bind(null, r.id)}>
                <button type="submit" className="text-xs font-medium text-red-500 hover:underline">
                  Delete
                </button>
              </form>
              <ReviewReplyForm reviewId={r.id} existingReply={r.instructorReply} />
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="rounded-2xl border border-dashed border-teal-200 px-4 py-10 text-center text-sm text-ink/50">No reviews found.</p>}
      </div>
    </div>
  );
}
