"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKes } from "@/lib/data";

type Step = "summary" | "processing" | "success";

export default function EnrollButton({
  slug,
  title,
  priceKes,
  className,
}: {
  slug: string;
  title: string;
  priceKes: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("summary");

  function reset() {
    setOpen(false);
    setTimeout(() => setStep("summary"), 200);
  }

  function pay() {
    setStep("processing");
    setTimeout(() => setStep("success"), 1100);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-teal-900 shadow-md transition hover:bg-gold-400"
        }
      >
        Enroll now
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {step === "summary" && (
              <>
                <h3 className="font-serif text-xl text-teal-900">Order summary</h3>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                  <div>
                    <p className="font-medium text-ink">{title}</p>
                    <p className="text-sm text-ink/60">Full lifetime access</p>
                  </div>
                  <p className="font-serif text-lg text-teal-700">{formatKes(priceKes)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-teal-100 pt-4 text-sm">
                  <span className="text-ink/60">Total due today</span>
                  <span className="font-semibold text-ink">{formatKes(priceKes)}</span>
                </div>
                <p className="mt-3 text-xs text-ink/40">
                  Demo checkout — no payment is processed. M-Pesa and card
                  options would appear here in the live product.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 rounded-full border border-teal-100 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-teal-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={pay}
                    className="flex-1 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                  >
                    Pay {formatKes(priceKes)}
                  </button>
                </div>
              </>
            )}

            {step === "processing" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
                <p className="font-medium text-ink">Processing your payment…</p>
                <p className="text-sm text-ink/50">This will only take a moment.</p>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                    <path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" />
                  </svg>
                </span>
                <h3 className="font-serif text-xl text-teal-900">You&apos;re enrolled!</h3>
                <p className="text-sm text-ink/60">
                  {title} has been added to your dashboard. Jump in whenever
                  you&apos;re ready.
                </p>
                <Link
                  href={`/dashboard?course=${slug}`}
                  className="mt-3 rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-gold-400"
                >
                  Start learning →
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm text-ink/40 hover:text-ink/60"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
