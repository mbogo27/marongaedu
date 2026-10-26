import Link from "next/link";
import { formatKes } from "@/lib/format";
import { enrollAction, toggleWishlistAction } from "@/lib/actions/courses";
import type { EnrollmentGate } from "@/lib/domain/enrollment-rules";

const primary =
  "block w-full rounded-full bg-gold-500 px-6 py-3 text-center text-sm font-semibold text-teal-900 shadow-md transition hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

export const GATE_LABEL: Record<Exclude<EnrollmentGate, "open" | "enrolled">, string> = {
  sold_out: "Sold out",
  closed: "Enrollment closed",
  not_open: "Enrollment opens soon",
};

export default function EnrollButton({
  slug,
  courseId,
  title,
  priceKes,
  effectivePriceKes,
  isFree,
  gate,
  isWishlisted,
  className,
}: {
  slug: string;
  courseId: string;
  title: string;
  priceKes: number;
  effectivePriceKes: number;
  isFree: boolean;
  gate: EnrollmentGate;
  isWishlisted?: boolean;
  className?: string;
}) {
  if (gate === "enrolled") {
    return (
      <Link
        href={`/learn/${slug}`}
        className={className ?? "block rounded-full bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-teal-800"}
      >
        Go to course →
      </Link>
    );
  }

  const free = isFree || effectivePriceKes === 0;

  return (
    <div className="flex items-center gap-2">
      <form action={enrollAction.bind(null, slug)} className="flex-1">
        {gate === "open" ? (
          <button type="submit" className={className ?? primary}>
            {free ? "Enroll free" : `Enroll now · ${formatKes(effectivePriceKes)}`}
            {!free && effectivePriceKes < priceKes && (
              <span className="ml-2 text-xs font-normal text-teal-900/70 line-through">{formatKes(priceKes)}</span>
            )}
          </button>
        ) : (
          <button type="button" disabled aria-disabled="true" className="block w-full cursor-not-allowed rounded-full bg-ink/10 px-6 py-3 text-center text-sm font-semibold text-ink/70">
            {GATE_LABEL[gate]}
          </button>
        )}
      </form>
      <form action={toggleWishlistAction.bind(null, courseId)}>
        <button
          type="submit"
          aria-label={isWishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          aria-pressed={!!isWishlisted}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
            isWishlisted ? "border-gold-400 bg-gold-50 text-gold-700" : "border-teal-200 text-teal-800 hover:bg-teal-50"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M12 21s-7-4.5-9.5-9C.7 8.4 2.3 4.5 6 4.5c2 0 3.4 1.1 4 2.1.6-1 2-2.1 4-2.1 3.7 0 5.3 3.9 3.5 7.5-2.5 4.5-9.5 9-9.5 9z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
