import Image from "next/image";
import Link from "next/link";
import { formatKes, formatDuration } from "@/lib/format";
import type { CourseCardData } from "@/lib/queries";
import LevelBadge from "./LevelBadge";

export default function CourseCard({ course }: { course: CourseCardData }) {
  const onSale = course.salePriceKes != null && course.effectivePriceKes < course.priceKes;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-teal-50">
        <Image
          src={course.thumbnailUrl}
          alt={course.title}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-teal-700 shadow-sm">
          {course.category.name}
        </span>
        {course.isFree && (
          <span className="absolute right-3 top-3 rounded-full bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            Free
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <LevelBadge level={course.level} />
          <span className="text-xs text-ink/50">{formatDuration(course.durationSeconds)}</span>
          {course.rating.count > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-ink/50">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-gold-500">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
              {course.rating.avg.toFixed(1)} ({course.rating.count})
            </span>
          )}
        </div>
        <h3 className="font-serif text-lg leading-snug text-teal-900">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-ink/70">{course.shortDescription}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            {course.isFree ? (
              <span className="font-serif text-lg text-teal-700">Free</span>
            ) : (
              <>
                <span className="font-serif text-lg text-teal-700">{formatKes(course.effectivePriceKes)}</span>
                {onSale && (
                  <span className="text-xs text-ink/40 line-through">{formatKes(course.priceKes)}</span>
                )}
              </>
            )}
          </div>
          <span className="text-sm font-medium text-gold-600 group-hover:underline">View course →</span>
        </div>
      </div>
    </Link>
  );
}
