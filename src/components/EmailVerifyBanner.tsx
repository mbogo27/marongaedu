"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/lib/actions/auth";

export default function EmailVerifyBanner() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gold-500 px-4 py-2 text-center text-sm font-medium text-teal-900"
    >
      {result ? (
        <span>{result.message}</span>
      ) : (
        <>
          <span>Verify your email to download certificates and write reviews.</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setResult(await resendVerificationAction());
              })
            }
            className="underline underline-offset-2 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Resend verification email"}
          </button>
        </>
      )}
    </div>
  );
}
