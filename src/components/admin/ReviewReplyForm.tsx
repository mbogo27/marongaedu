"use client";

import { useState } from "react";
import { replyToReviewAction } from "@/lib/actions/admin/reviews";

export default function ReviewReplyForm({ reviewId, existingReply }: { reviewId: string; existingReply: string | null }) {
  const [open, setOpen] = useState(!!existingReply);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline">
        Reply
      </button>
    );
  }

  return (
    <form action={replyToReviewAction.bind(null, reviewId)} className="mt-2 flex w-full gap-2">
      <label className="sr-only" htmlFor={`reply-${reviewId}`}>
        Reply as instructor
      </label>
      <input
        id={`reply-${reviewId}`}
        name="reply"
        defaultValue={existingReply ?? ""}
        maxLength={2000}
        placeholder="Reply as instructor…"
        className="flex-1 rounded-lg border border-teal-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
      />
      <button type="submit" className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800">
        Save
      </button>
    </form>
  );
}
