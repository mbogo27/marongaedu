"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDisplayCurrencyAction } from "@/lib/actions/currency";

/** Display-only KES/USD switch (remembered in a cookie; charges are always KES). */
export default function CurrencyToggle({ current }: { current: "KES" | "USD" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Display currency" className="inline-flex rounded-full bg-teal-50 p-1 text-xs font-medium">
      {(["KES", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          disabled={pending}
          aria-pressed={current === c}
          onClick={() =>
            start(async () => {
              await setDisplayCurrencyAction(c);
              router.refresh();
            })
          }
          className={`rounded-full px-3 py-1 ${current === c ? "bg-white text-teal-900 shadow-sm" : "text-ink/80 hover:text-ink"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
