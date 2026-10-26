import { formatDate } from "@/lib/format";
import { voteReviewAction } from "@/lib/actions/courses";
import ReviewForm from "./ReviewForm";

type Review = {
  id: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: Date;
  instructorReply: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
  votes: { userId: string; helpful: boolean }[];
};

const STAR = "M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z";

export default function ReviewsSection({
  courseId,
  slug,
  reviews,
  rating,
  viewerId,
  canReview,
  reviewBlockedReason,
}: {
  courseId: string;
  slug: string;
  reviews: Review[];
  rating: { avg: number; count: number; breakdown: number[] };
  viewerId: string | null;
  /** Enrolled + verified + meets the minimum-progress rule. */
  canReview: boolean;
  /** Why the viewer can't review (shown to enrolled learners only). */
  reviewBlockedReason?: string;
}) {
  const own = viewerId ? reviews.find((r) => r.userId === viewerId) : undefined;

  return (
    <section aria-labelledby="reviews-h" className="space-y-6">
      <h2 id="reviews-h" className="font-serif text-2xl text-teal-900">
        Reviews
      </h2>

      {rating.count > 0 ? (
        <div className="flex flex-col gap-6 rounded-2xl border border-teal-100 bg-white p-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center justify-center sm:w-40">
            <p className="font-serif text-4xl text-teal-900">{rating.avg.toFixed(1)}</p>
            <div className="mt-1 flex gap-0.5" role="img" aria-label={`${rating.avg.toFixed(1)} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} viewBox="0 0 20 20" className={`h-4 w-4 ${rating.avg >= s - 0.5 ? "fill-gold-500" : "fill-ink/20"}`} aria-hidden="true">
                  <path d={STAR} />
                </svg>
              ))}
            </div>
            <p className="mt-1 text-sm text-ink/70">
              {rating.count} review{rating.count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star, i) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-ink/80">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-teal-50">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${rating.breakdown[i]}%` }} />
                </div>
                <span className="w-10 text-right text-ink/70">{rating.breakdown[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/70">No reviews yet — be the first to share your experience.</p>
      )}

      {canReview ? (
        <ReviewForm courseId={courseId} slug={slug} initial={own ? { rating: own.rating, text: own.text } : undefined} />
      ) : (
        reviewBlockedReason && <p className="rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-900">{reviewBlockedReason}</p>
      )}

      <ul className="space-y-4">
        {reviews.map((review) => {
          const helpful = review.votes.filter((v) => v.helpful).length;
          const unhelpful = review.votes.length - helpful;
          const mine = viewerId ? review.votes.find((v) => v.userId === viewerId) : undefined;
          return (
            <li key={review.id} className="rounded-2xl border border-teal-100 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white" aria-hidden="true">
                  {review.user.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{review.user.name}</p>
                  <p className="text-xs text-ink/70">{formatDate(review.createdAt)}</p>
                </div>
                <div className="ml-auto flex gap-0.5" role="img" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${review.rating >= s ? "fill-gold-500" : "fill-ink/20"}`} aria-hidden="true">
                      <path d={STAR} />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-ink/80">{review.text}</p>
              {review.instructorReply && (
                <div className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm">
                  <p className="font-medium text-teal-900">Instructor reply</p>
                  <p className="mt-1 text-teal-900/90">{review.instructorReply}</p>
                </div>
              )}
              {viewerId && review.userId !== viewerId && (
                <div className="mt-3 flex items-center gap-2 text-xs text-ink/70">
                  <span>Was this helpful?</span>
                  {([true, false] as const).map((val) => (
                    <form key={String(val)} action={voteReviewAction.bind(null, review.id, val, slug)}>
                      <button
                        type="submit"
                        aria-pressed={mine?.helpful === val}
                        className={`rounded-full border px-3 py-1 font-medium ${mine?.helpful === val ? "border-teal-700 bg-teal-50 text-teal-900" : "border-teal-200 text-ink/80 hover:bg-teal-50"}`}
                      >
                        {val ? `Yes (${helpful})` : `No (${unhelpful})`}
                      </button>
                    </form>
                  ))}
                </div>
              )}
              {(!viewerId || review.userId === viewerId) && helpful > 0 && (
                <p className="mt-3 text-xs text-ink/70">{helpful} found this helpful</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
