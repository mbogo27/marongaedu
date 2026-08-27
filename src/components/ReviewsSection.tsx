import { formatDate } from "@/lib/format";
import ReviewForm from "./ReviewForm";

type Review = {
  id: string;
  rating: number;
  text: string;
  createdAt: Date;
  instructorReply: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

export default function ReviewsSection({
  courseId,
  slug,
  reviews,
  rating,
  canReview,
  alreadyReviewed,
}: {
  courseId: string;
  slug: string;
  reviews: Review[];
  rating: { avg: number; count: number; breakdown: number[] };
  canReview: boolean;
  alreadyReviewed: boolean;
}) {
  return (
    <section className="space-y-6">
      <h2 className="font-serif text-2xl text-teal-900">Reviews</h2>

      {rating.count > 0 ? (
        <div className="flex flex-col gap-6 rounded-2xl border border-teal-100 bg-white p-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center justify-center sm:w-40">
            <p className="font-serif text-4xl text-teal-900">{rating.avg.toFixed(1)}</p>
            <div className="mt-1 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} viewBox="0 0 20 20" className={`h-4 w-4 ${rating.avg >= s - 0.5 ? "fill-gold-500" : "fill-ink/15"}`}>
                  <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
                </svg>
              ))}
            </div>
            <p className="mt-1 text-sm text-ink/50">{rating.count} review{rating.count === 1 ? "" : "s"}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star, i) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-ink/60">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-teal-50">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${rating.breakdown[i]}%` }} />
                </div>
                <span className="w-10 text-right text-ink/50">{rating.breakdown[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/50">No reviews yet — be the first to share your experience.</p>
      )}

      {canReview && !alreadyReviewed && <ReviewForm courseId={courseId} slug={slug} />}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-teal-100 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                {review.user.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{review.user.name}</p>
                <p className="text-xs text-ink/40">{formatDate(review.createdAt)}</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${review.rating >= s ? "fill-gold-500" : "fill-ink/15"}`}>
                    <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/80">{review.text}</p>
            {review.instructorReply && (
              <div className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm">
                <p className="font-medium text-teal-800">Instructor reply</p>
                <p className="mt-1 text-teal-700">{review.instructorReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
