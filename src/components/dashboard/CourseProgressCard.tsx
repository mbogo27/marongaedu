import Image from "next/image";
import Link from "next/link";

export default function CourseProgressCard({
  slug,
  title,
  thumbnailUrl,
  progressPercent,
  completed,
  lastLessonId,
}: {
  slug: string;
  title: string;
  thumbnailUrl: string;
  progressPercent: number;
  completed: boolean;
  lastLessonId?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
      <div className="relative aspect-video w-full">
        <Image src={thumbnailUrl} alt={title} fill sizes="360px" className="object-cover" />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-serif text-base text-teal-900">{title}</h3>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-50">
          <div className={`h-full rounded-full ${completed ? "bg-gold-500" : "bg-teal-600"}`} style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink/70">{progressPercent}% complete</p>
        <Link
          href={`/learn/${slug}${lastLessonId && !completed ? `?lesson=${lastLessonId}` : ""}`}
          className="mt-3 block rounded-full bg-teal-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          {completed ? "Review course" : "Continue"}
        </Link>
      </div>
    </div>
  );
}
