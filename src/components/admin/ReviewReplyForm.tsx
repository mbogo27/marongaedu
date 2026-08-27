"use client";

import { useState } from "react";
import { replyToReviewAction } from "@/lib/actions/admin/reviews";

export default function ReviewReplyForm({ reviewId, existingReply }: { reviewId: string; existingReply: string | null }) {
  const [open, setOpen] = useState(!!existingReply);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-teal-700 hover:underline">
        Reply
      </button>
    );
  }

  return (
    <form action={replyToReviewAction.bind(null, reviewId)} className="mt-2 flex gap-2">
      <input name="reply" defaultValue={existingReply ?? ""} placeholder="Reply as instructor..." className="flex-1 rounded-lg border border-teal-100 px-3 py-1.5 text-xs focus:border-teal-400 focus:outline-none" />
      <button type="submit" className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
        Save
      </button>
    </form>
  );
}
