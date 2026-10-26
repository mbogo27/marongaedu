"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * A button that runs a server action after an optional confirm(), shows any
 * returned error, and refreshes the page. Use for row actions in admin tables.
 */
export default function ConfirmAction({
  action,
  confirm,
  children,
  className = "text-xs font-medium text-teal-800 underline-offset-2 hover:underline",
  pendingText,
}: {
  action: () => Promise<{ ok: boolean; error?: string } | void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        className={`${className} disabled:opacity-60`}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            setError(null);
            const res = await action();
            if (res && !res.ok) setError(res.error ?? "Something went wrong.");
            router.refresh();
          });
        }}
      >
        {pending ? (pendingText ?? "Working…") : children}
      </button>
      {error && (
        <span role="alert" className="mt-1 max-w-[16rem] text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
