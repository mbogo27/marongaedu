import Link from "next/link";
import { formatKes } from "@/lib/format";
import { enrollAction, toggleWishlistAction } from "@/lib/actions/courses";

export default function EnrollButton({
  slug,
  courseId,
  title,
  priceKes,
  effectivePriceKes,
  isFree,
  isEnrolled,
  isWishlisted,
  className,
}: {
  slug: string;
  courseId: string;
  title: string;
  priceKes: number;
  effectivePriceKes: number;
  isFree: boolean;
  isEnrolled: boolean;
  isWishlisted?: boolean;
  className?: string;
}) {
  if (isEnrolled) {
    return (
      <Link
        href={`/learn/${slug}`}
        className={
          className ??
          "block rounded-full bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-teal-800"
        }
      >
        Go to course →
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <form action={enrollAction.bind(null, slug)} className="flex-1">
        <button
          type="submit"
          className={
            className ??
            "w-full rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-teal-900 shadow-md transition hover:bg-gold-400"
          }
        >
          {isFree ? "Enroll free" : `Enroll now · ${formatKes(effectivePriceKes)}`}
          {!isFree && effectivePriceKes < priceKes && (
            <span className="ml-2 text-xs font-normal text-teal-900/60 line-through">{formatKes(priceKes)}</span>
          )}
        </button>
      </form>
      <form action={toggleWishlistAction.bind(null, courseId)}>
        <button
          type="submit"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={title}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
            isWishlisted
              ? "border-gold-400 bg-gold-50 text-gold-600"
              : "border-teal-100 text-teal-700 hover:bg-teal-50"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path d="M12 21s-7-4.5-9.5-9C.7 8.4 2.3 4.5 6 4.5c2 0 3.4 1.1 4 2.1.6-1 2-2.1 4-2.1 3.7 0 5.3 3.9 3.5 7.5-2.5 4.5-9.5 9-9.5 9z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
