import Image from "next/image";
import Link from "next/link";
import type { Course } from "@/lib/types";
import { formatKes } from "@/lib/data";
import LevelBadge from "./LevelBadge";

export default function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-teal-50">
        <Image
          src={`https://picsum.photos/seed/${course.thumbnailSeed}/640/400`}
          alt={course.title}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-teal-700 shadow-sm">
          {course.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <LevelBadge level={course.level} />
          <span className="text-xs text-ink/50">{course.durationLabel}</span>
        </div>
        <h3 className="font-serif text-lg leading-snug text-teal-900">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm text-ink/70">{course.blurb}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-serif text-lg text-teal-700">
            {formatKes(course.priceKes)}
          </span>
          <span className="text-sm font-medium text-gold-600 group-hover:underline">
            View course →
          </span>
        </div>
      </div>
    </Link>
  );
}
