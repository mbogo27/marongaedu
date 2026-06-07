"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getCourseBySlug } from "@/lib/data";

function DashboardContent() {
  const params = useSearchParams();
  const slug = params.get("course");
  const course = slug ? getCourseBySlug(slug) : undefined;

  // Demo: a freshly-enrolled course starts with a small amount of progress.
  const progress = course ? 8 : 0;

  return (
    <main className="flex-1 bg-teal-50/30">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-serif text-3xl text-teal-900">Welcome back</h1>
        <p className="mt-1 text-ink/60">Here&apos;s where you left off.</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_280px]">
          <section>
            <h2 className="font-serif text-xl text-teal-900">My courses</h2>

            {course ? (
              <div className="mt-4 flex flex-col gap-4 overflow-hidden rounded-2xl border border-teal-100 bg-white p-5 sm:flex-row">
                <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-44 sm:w-56">
                  <Image
                    src={`https://picsum.photos/seed/${course.thumbnailSeed}/480/320`}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="text-xs font-medium uppercase tracking-wide text-gold-600">
                    {course.category}
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-teal-900">{course.title}</h3>
                  <p className="mt-1 text-sm text-ink/60">
                    {course.modules.length} modules · {course.durationLabel} total
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-ink/50">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-teal-100">
                      <div
                        className="h-full rounded-full bg-gold-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                  >
                    Continue learning →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-teal-200 bg-white p-8">
                <p className="text-ink/70">
                  You haven&apos;t enrolled in any courses yet.
                </p>
                <Link
                  href="/#courses"
                  className="rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-gold-400"
                >
                  Browse courses
                </Link>
              </div>
            )}
          </section>

          <aside>
            <h2 className="font-serif text-xl text-teal-900">Profile</h2>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white p-5 text-sm">
              <div>
                <p className="text-ink/50">Name</p>
                <p className="font-medium text-ink">Demo Learner</p>
              </div>
              <div>
                <p className="text-ink/50">Email</p>
                <p className="font-medium text-ink">demo.learner@example.co.ke</p>
              </div>
              <div>
                <p className="text-ink/50">Member since</p>
                <p className="font-medium text-ink">June 2026</p>
              </div>
              <p className="mt-1 text-xs text-ink/40">
                Demo account — display only, nothing here is editable yet.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1" />}>
        <DashboardContent />
      </Suspense>
      <SiteFooter />
    </>
  );
}
