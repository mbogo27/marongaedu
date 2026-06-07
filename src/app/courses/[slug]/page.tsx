import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LevelBadge from "@/components/LevelBadge";
import VideoPlayer from "@/components/VideoPlayer";
import CurriculumAccordion from "@/components/CurriculumAccordion";
import EnrollButton from "@/components/EnrollButton";
import { courses, formatKes, getCourseBySlug, instructor, testimonials } from "@/lib/data";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const shownTestimonials = testimonials.slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-teal-100 bg-teal-50/50">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <p className="text-sm text-teal-700">
              <Link href="/#courses" className="hover:underline">
                Courses
              </Link>{" "}
              / <span className="text-ink/60">{course.category}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <LevelBadge level={course.level} />
              <span className="text-sm text-ink/50">{course.durationLabel} of content</span>
              <span className="text-sm text-ink/50">·</span>
              <span className="text-sm text-ink/50">{course.enrollments} students enrolled</span>
            </div>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl text-teal-900 sm:text-4xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-ink/70">{course.blurb}</p>
            <p className="mt-3 text-sm text-ink/60">
              Taught by{" "}
              <span className="font-medium text-teal-700">{instructor.name}</span> ·{" "}
              {instructor.credentials}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="font-serif text-3xl text-teal-700">
                {formatKes(course.priceKes)}
              </span>
              <EnrollButton slug={course.slug} title={course.title} priceKes={course.priceKes} />
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-12">
            {/* Preview video */}
            <div>
              <VideoPlayer
                videoId={course.previewVideoId}
                posterSeed={course.thumbnailSeed}
                title={course.title}
              />
              <p className="mt-3 text-sm text-ink/50">
                Watch a free preview from the course — no sign-up required.
              </p>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-2xl text-teal-900">About this course</h2>
              <div className="mt-4 flex flex-col gap-4 text-ink/75">
                {course.description.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* What you'll learn */}
            <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6">
              <h2 className="font-serif text-2xl text-teal-900">What you&apos;ll learn</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2.5 text-sm text-ink/75">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-teal-600">
                      <path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" />
                    </svg>
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>

            {/* Curriculum */}
            <div>
              <h2 className="mb-4 font-serif text-2xl text-teal-900">Course curriculum</h2>
              <CurriculumAccordion modules={course.modules} />
            </div>

            {/* Instructor bio */}
            <div className="flex flex-col gap-5 rounded-2xl border border-teal-100 bg-white p-6 sm:flex-row">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={instructor.photoUrl}
                  alt={instructor.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-gold-600">
                  Your instructor
                </p>
                <h3 className="mt-1 font-serif text-xl text-teal-900">{instructor.name}</h3>
                <p className="text-sm text-ink/60">{instructor.credentials}</p>
                <p className="mt-3 text-sm text-ink/70">{instructor.bio}</p>
              </div>
            </div>

            {/* Testimonials */}
            <div>
              <h2 className="mb-4 font-serif text-2xl text-teal-900">What students say</h2>
              <div className="grid gap-5 sm:grid-cols-3">
                {shownTestimonials.map((t) => (
                  <figure
                    key={t.name}
                    className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white p-5"
                  >
                    <div className="flex gap-0.5 text-gold-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 7-6.3-3.8L5.7 21l1.7-7L2 9.2l7.1-.6z" />
                        </svg>
                      ))}
                    </div>
                    <blockquote className="text-sm text-ink/75">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="mt-auto text-sm">
                      <span className="font-medium text-ink">{t.name}</span>
                      <span className="block text-ink/50">{t.role}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-teal-900 px-6 py-10 text-center">
              <h2 className="font-serif text-2xl text-white">
                Ready to put this into practice?
              </h2>
              <p className="max-w-md text-sm text-teal-100/80">
                Enroll today for {formatKes(course.priceKes)} and get full,
                lifetime access to {course.title}.
              </p>
              <EnrollButton slug={course.slug} title={course.title} priceKes={course.priceKes} />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="sticky top-24 flex flex-col gap-4 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                <Image
                  src={`https://picsum.photos/seed/${course.thumbnailSeed}/640/400`}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="font-serif text-2xl text-teal-700">{formatKes(course.priceKes)}</p>
              <EnrollButton
                slug={course.slug}
                title={course.title}
                priceKes={course.priceKes}
                className="w-full rounded-full bg-gold-500 px-6 py-3 text-center text-sm font-semibold text-teal-900 shadow-md transition hover:bg-gold-400"
              />
              <ul className="flex flex-col gap-2 text-sm text-ink/70">
                <li className="flex items-center justify-between">
                  <span>Level</span>
                  <span className="font-medium text-ink">{course.level}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Duration</span>
                  <span className="font-medium text-ink">{course.durationLabel}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Modules</span>
                  <span className="font-medium text-ink">{course.modules.length}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Access</span>
                  <span className="font-medium text-ink">Lifetime</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
