"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/lib/actions/auth";
import { FormMessage, primaryButtonClass } from "@/components/ui/Field";

export default function ResendVerification() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className={`${primaryButtonClass} px-6`}
        onClick={() => start(async () => setResult(await resendVerificationAction()))}
      >
        {pending ? "Sending…" : "Send a new link"}
      </button>
      {result && <FormMessage error={result.ok ? undefined : result.message} message={result.ok ? result.message : undefined} />}
    </div>
  );
}
