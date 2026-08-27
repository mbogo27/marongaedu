"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/lib/actions/auth";

export default function EmailVerifyBanner() {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <div className="bg-teal-700 px-4 py-2 text-center text-sm text-white">
        Verification email sent — check the admin notifications feed for the demo link.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-gold-500 px-4 py-2 text-center text-sm font-medium text-teal-900">
      Verify your email to unlock certificate downloads.
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resendVerificationAction();
            setSent(true);
          })
        }
        className="underline underline-offset-2 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}
