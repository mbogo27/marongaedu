"use client";

import { useState } from "react";
import { submitReviewAction } from "@/lib/actions/courses";

export default function ReviewForm({ courseId, slug }: { courseId: string; slug: string }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (submitted) {
    return <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700">Thanks for your review!</p>;
  }

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError(null);
        formData.set("rating", String(rating));
        const result = await submitReviewAction(courseId, slug, formData);
        setPending(false);
        if (result?.error) setError(result.error);
        else setSubmitted(true);
      }}
      className="rounded-2xl border border-teal-100 bg-white p-5"
    >
      <h3 className="font-serif text-lg text-teal-900">Write a review</h3>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="p-0.5"
          >
            <svg
              viewBox="0 0 20 20"
              className={`h-6 w-6 ${(hoverRating || rating) >= star ? "fill-gold-500" : "fill-ink/15"}`}
            >
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
            </svg>
          </button>
        ))}
      </div>
      <textarea
        name="text"
        required
        minLength={10}
        rows={4}
        placeholder="Share what you learned and how you'd apply it..."
        className="mt-3 w-full rounded-xl border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
