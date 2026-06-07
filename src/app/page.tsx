import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CourseCard from "@/components/CourseCard";
import { categories, courses, instructor } from "@/lib/data";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-teal-100">
          <div className="absolute inset-0">
            <Image
              src="https://picsum.photos/seed/maronga-hero/1920/1080"
              alt=""
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-teal-900/75 to-teal-900/40" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-24 md:py-32">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-gold-300 ring-1 ring-inset ring-white/20">
              Taught by a practicing clinician in Nairobi
            </span>
            <h1 className="max-w-2xl font-serif text-4xl leading-tight text-white sm:text-5xl">
              Authoritative dental education from a practicing clinician.
            </h1>
            <p className="max-w-xl text-lg text-teal-50/90">
              Maronga Dental Academy turns Dr. Maronga&apos;s years at the
              chairside into structured, practical courses for dental
              students and practitioners across Kenya — priced in Kenya
              Shillings, built for real clinical life.
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              <a
                href="#courses"
                className="rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-teal-900 shadow-lg transition hover:bg-gold-400"
              >
                Browse courses
              </a>
              <Link
                href={`/courses/${courses[0].slug}`}
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Watch a free preview
              </Link>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-6 py-10">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-ink/50">
            Course categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-teal-100 bg-white px-4 py-1.5 text-sm text-teal-700"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* Course grid */}
        <section id="courses" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="font-serif text-3xl text-teal-900">
              Courses to grow your practice
            </h2>
            <p className="max-w-2xl text-ink/70">
              Each course is built around real clinical cases, narrated
              chairside by Dr. Maronga — from foundational topics for
              students to advanced protocols for practicing dentists.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </section>

        {/* Instructor strip */}
        <section className="border-y border-teal-100 bg-teal-50/60">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[280px_1fr]">
            <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-full border-4 border-white shadow-lg md:mx-0 md:w-full">
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
              <h2 className="mt-2 font-serif text-3xl text-teal-900">
                {instructor.name}
              </h2>
              <p className="mt-1 text-sm text-ink/60">
                {instructor.credentials}
              </p>
              <p className="mt-4 max-w-2xl text-ink/70">{instructor.bio}</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
