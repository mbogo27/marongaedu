"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatKes } from "@/lib/format";
import { enrollAction } from "@/lib/actions/courses";
import type { EnrollmentGate } from "@/lib/domain/enrollment-rules";

const LABEL = { sold_out: "Sold out", closed: "Enrollment closed", not_open: "Opens soon" } as const;

export default function StickyEnrollBar({
  slug,
  title,
  isFree,
  effectivePriceKes,
  gate,
}: {
  slug: string;
  title: string;
  isFree: boolean;
  effectivePriceKes: number;
  gate: EnrollmentGate;
}) {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px" />
      {visible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-100 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{title}</p>
              <p className="text-sm font-semibold text-teal-800">{isFree || effectivePriceKes === 0 ? "Free" : formatKes(effectivePriceKes)}</p>
            </div>
            {gate === "enrolled" ? (
              <Link href={`/learn/${slug}`} className="shrink-0 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
                Go to course
              </Link>
            ) : gate === "open" ? (
              <form action={enrollAction.bind(null, slug)} className="shrink-0">
                <button type="submit" className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-teal-900">
                  Enroll now
                </button>
              </form>
            ) : (
              <span className="shrink-0 rounded-full bg-ink/10 px-4 py-2 text-sm font-semibold text-ink/70">{LABEL[gate]}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
