"use client";

import { useState } from "react";
import { submitReviewAction } from "@/lib/actions/courses";
import { FormMessage, inputClass, primaryButtonClass } from "@/components/ui/Field";

export default function ReviewForm({
  courseId,
  slug,
  initial,
}: {
  courseId: string;
  slug: string;
  initial?: { rating: number; text: string };
}) {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
        Thanks for your review!
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError(null);
        formData.set("rating", String(rating));
        const result = await submitReviewAction(courseId, slug, formData);
        setPending(false);
        if (result.error) setError(result.error);
        else setDone(true);
      }}
      className="rounded-2xl border border-teal-100 bg-white p-5"
    >
      <h3 className="font-serif text-lg text-teal-900">{initial ? "Edit your review" : "Write a review"}</h3>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <svg viewBox="0 0 20 20" className={`h-6 w-6 ${(hoverRating || rating) >= star ? "fill-gold-500" : "fill-ink/20"}`} aria-hidden="true">
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
            </svg>
          </button>
        ))}
      </div>
      <label htmlFor="review-text" className="sr-only">
        Your review
      </label>
      <textarea
        id="review-text"
        name="text"
        required
        minLength={10}
        rows={4}
        defaultValue={initial?.text}
        placeholder="Share what you learned and how you'd apply it…"
        className={inputClass}
      />
      <div className="mt-2">
        <FormMessage error={error ?? undefined} />
      </div>
      <button type="submit" disabled={pending} className={`mt-3 ${primaryButtonClass}`}>
        {pending ? "Submitting…" : initial ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
