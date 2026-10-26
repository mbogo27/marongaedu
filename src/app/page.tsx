import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CourseCard from "@/components/CourseCard";
import { getFeaturedCourses, getCategories, listCourses, getInstructorStats } from "@/lib/queries";
import { getInstructor, getSetting } from "@/lib/settings";
import { testimonials } from "@/lib/testimonials";

export default async function Home() {
  const [featured, categories, { courses: latestCourses }, instructor, general] = await Promise.all([
    getFeaturedCourses(4),
    getCategories(),
    listCourses({ sort: "newest", page: 1 }),
    getInstructor(),
    getSetting("general"),
  ]);
  const stats = instructor ? await getInstructorStats(instructor.id) : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="relative overflow-hidden border-b border-teal-100">
          <div className="absolute inset-0">
            <Image src="https://picsum.photos/seed/maronga-hero/1920/1080" alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-teal-900/75 to-teal-900/40" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-24 md:py-32">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-gold-200 ring-1 ring-inset ring-white/20">
              Taught by a practicing clinician
            </span>
            <h1 className="max-w-2xl font-serif text-4xl leading-tight text-white sm:text-5xl">{general.tagline}.</h1>
            <p className="max-w-xl text-lg text-teal-50/90">
              {general.siteName} turns the instructor&apos;s years at the chairside into structured, practical courses
              for dental students and practitioners across Kenya — priced in Kenya Shillings, built for real
              clinical life.
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-teal-900 shadow-lg transition hover:bg-gold-400"
              >
                Browse courses
              </Link>
              {featured[0] && (
                <Link
                  href={`/courses/${featured[0].slug}`}
                  className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Watch a free preview
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-ink/70">Browse by category</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="flex items-center justify-between rounded-2xl border border-teal-100 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <p className="font-serif text-lg text-teal-900">{cat.name}</p>
                  <p className="text-sm text-ink/70">{cat._count.courses} courses</p>
                </div>
                <span className="text-gold-800">→</span>
              </Link>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-6">
            <h2 className="mb-8 font-serif text-3xl text-teal-900">Featured courses</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        <section id="courses" className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl text-teal-900">All courses</h2>
              <p className="mt-2 max-w-2xl text-ink/70">
                Each course is built around real clinical cases, narrated chairside by the instructor.
              </p>
            </div>
            <Link href="/courses" className="text-sm font-medium text-gold-800 hover:underline">
              Browse all courses →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestCourses.slice(0, 6).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        {instructor && (
          <section id="about" className="border-y border-teal-100 bg-teal-50/60">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[280px_1fr]">
              <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-full border-4 border-white shadow-lg md:mx-0 md:w-full">
                <Image src={instructor.avatarUrl ?? "/maronga.jpg"} alt={instructor.name} fill sizes="280px" className="object-cover" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-gold-800">Your instructor</p>
                <h2 className="mt-2 font-serif text-3xl text-teal-900">{instructor.name}</h2>
                <p className="mt-1 text-sm text-ink/70">Instructor, {general.siteName}</p>
                <p className="mt-4 max-w-2xl text-ink/70">{instructor.bio}</p>
                {stats && (
                  <div className="mt-6 flex flex-wrap gap-8 text-sm">
                    <div>
                      <p className="font-serif text-2xl text-teal-900">{stats.courseCount}</p>
                      <p className="text-ink/70">Courses taught</p>
                    </div>
                    <div>
                      <p className="font-serif text-2xl text-teal-900">{stats.totalStudents}</p>
                      <p className="text-ink/70">Students taught</p>
                    </div>
                    <div>
                      <p className="font-serif text-2xl text-teal-900">
                        {stats.rating.count > 0 ? stats.rating.avg.toFixed(1) : "—"}
                      </p>
                      <p className="text-ink/70">Average rating</p>
                    </div>
                  </div>
                )}
                <Link href="/about" className="mt-6 inline-block text-sm font-medium text-gold-800 hover:underline">
                  Read the full story →
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 font-serif text-3xl text-teal-900">What learners say</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                <blockquote className="text-ink/80">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-medium text-teal-900">{t.name}</span>
                  <span className="block text-ink/70">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="border-t border-teal-100 bg-teal-900">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-3xl text-white">Start learning today</h2>
            <Link
              href="/signup"
              className="rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-teal-900 shadow-lg transition hover:bg-gold-400"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
