"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { saveCourseAction, type SaveState } from "@/lib/actions/admin/courses";
import DynamicListEditor from "./DynamicListEditor";
import RichTextEditor from "./RichTextEditor";
import CurriculumBuilder, { type EditableModule } from "./CurriculumBuilder";

const TABS = ["basics", "media", "curriculum", "pricing", "seo", "settings"] as const;
type Tab = (typeof TABS)[number];

export type EditorCourse = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  categoryId: string;
  level: string;
  language: string;
  priceKes: number;
  salePriceKes: number | null;
  saleEndsAt: string | null;
  isFree: boolean;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  previewVideoUrl: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  isFeatured: boolean;
  enrollmentCap: number | null;
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
  status: string;
  outcomes: string[];
  requirements: string[];
  audience: string[];
  modules: EditableModule[];
};

export default function CourseEditorForm({
  course,
  categories,
}: {
  course?: EditorCourse;
  categories: { id: string; name: string }[];
}) {
  const boundAction = saveCourseAction.bind(null, course?.id ?? null);
  const [state, action, pending] = useActionState<SaveState, FormData>(boundAction, undefined);

  const [tab, setTab] = useState<Tab>("basics");
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [isFree, setIsFree] = useState(course?.isFree ?? false);
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnailUrl ?? "");
  const [descriptionHtml, setDescriptionHtml] = useState(course?.description ?? "<p></p>");
  const [outcomes, setOutcomes] = useState<string[]>(course?.outcomes ?? []);
  const [requirements, setRequirements] = useState<string[]>(course?.requirements ?? []);
  const [audience, setAudience] = useState<string[]>(course?.audience ?? []);
  const [modules, setModules] = useState<EditableModule[]>(course?.modules ?? []);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="outcomesJson" value={JSON.stringify(outcomes)} readOnly />
      <input type="hidden" name="requirementsJson" value={JSON.stringify(requirements)} readOnly />
      <input type="hidden" name="audienceJson" value={JSON.stringify(audience)} readOnly />
      <input type="hidden" name="curriculumJson" value={JSON.stringify(modules)} readOnly />
      <input type="hidden" name="descriptionHtml" value={descriptionHtml} readOnly />

      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/courses" className="text-sm text-teal-700 hover:underline">
            ← All courses
          </Link>
          <h1 className="mt-1 font-serif text-2xl text-teal-900">{course ? "Edit course" : "New course"}</h1>
        </div>
        {course && (
          <Link href={`/courses/${course.slug}`} target="_blank" className="rounded-full border border-teal-100 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
            Preview live page →
          </Link>
        )}
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-full bg-teal-50 p-1 text-sm font-medium">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 capitalize transition ${tab === t ? "bg-white text-teal-700 shadow-sm" : "text-ink/60"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className={tab === "basics" ? "" : "hidden"}>
        <div className="space-y-5 rounded-2xl border border-teal-100 bg-white p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-ink/70">Title</label>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70">Slug</label>
              <input
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated from title if left blank"
                className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Subtitle</label>
            <input name="subtitle" defaultValue={course?.subtitle ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-ink/70">Category</label>
              <select name="categoryId" defaultValue={course?.categoryId} required className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70">Level</label>
              <select name="level" defaultValue={course?.level ?? "BEGINNER"} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none">
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="ALL_LEVELS">All levels</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70">Language</label>
              <input name="language" defaultValue={course?.language ?? "English"} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Short description (~160 chars, used on cards)</label>
            <textarea
              name="shortDescription"
              defaultValue={course?.shortDescription ?? ""}
              maxLength={200}
              rows={2}
              required
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Full description</label>
            <div className="mt-1">
              <RichTextEditor content={descriptionHtml} onChange={setDescriptionHtml} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <DynamicListEditor label="What you'll learn" placeholder="Outcome" items={outcomes} onChange={setOutcomes} />
            <DynamicListEditor label="Requirements" placeholder="Requirement" items={requirements} onChange={setRequirements} />
            <DynamicListEditor label="Target audience" placeholder="Audience" items={audience} onChange={setAudience} />
          </div>
        </div>
      </div>

      <div className={tab === "media" ? "" : "hidden"}>
        <div className="grid gap-6 rounded-2xl border border-teal-100 bg-white p-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink/70">Thumbnail (1280×720 recommended)</label>
            <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
              {thumbnailUrl && <Image src={thumbnailUrl} alt="" fill className="object-cover" unoptimized={thumbnailUrl.startsWith("/uploads")} />}
            </div>
            <input
              name="thumbnailUrl"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-lg border border-teal-100 px-4 py-2 text-sm focus:border-teal-400 focus:outline-none"
            />
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-teal-200 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50">
              <input type="file" name="thumbnailFile" accept="image/*" className="sr-only" />
              Or upload a new thumbnail
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Preview video URL</label>
            <input
              name="previewVideoUrl"
              defaultValue={course?.previewVideoUrl ?? "/videos/placeholder-1.mp4"}
              className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
            />
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-teal-200 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50">
              <input type="file" name="previewVideoFile" accept="video/*" className="sr-only" />
              Or upload a video file
            </label>
            <p className="mt-2 text-xs text-ink/40">Leave as a placeholder path to reuse the demo clip pool in public/videos.</p>
          </div>
        </div>
      </div>

      <div className={tab === "curriculum" ? "" : "hidden"}>
        <div className="rounded-2xl border border-teal-100 bg-white p-6">
          <CurriculumBuilder modules={modules} onChange={setModules} />
        </div>
      </div>

      <div className={tab === "pricing" ? "" : "hidden"}>
        <div className="space-y-5 rounded-2xl border border-teal-100 bg-white p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-ink/80">
            <input type="checkbox" name="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-4 w-4 rounded border-teal-300 text-teal-600" />
            This course is free
          </label>
          {!isFree && (
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-ink/70">Price (KES)</label>
                <input name="priceKes" type="number" min={0} defaultValue={course?.priceKes ?? 0} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Sale price (KES, optional)</label>
                <input name="salePriceKes" type="number" min={0} defaultValue={course?.salePriceKes ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Sale ends</label>
                <input name="saleEndsAt" type="date" defaultValue={course?.saleEndsAt?.slice(0, 10) ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={tab === "seo" ? "" : "hidden"}>
        <div className="space-y-5 rounded-2xl border border-teal-100 bg-white p-6">
          <div>
            <label className="text-sm font-medium text-ink/70">Meta title</label>
            <input name="metaTitle" defaultValue={course?.metaTitle ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Meta description</label>
            <textarea name="metaDescription" defaultValue={course?.metaDescription ?? ""} rows={2} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">OG image URL (defaults to thumbnail)</label>
            <input name="ogImageUrl" defaultValue={course?.ogImageUrl ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className={tab === "settings" ? "" : "hidden"}>
        <div className="space-y-5 rounded-2xl border border-teal-100 bg-white p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-ink/80">
            <input type="checkbox" name="isFeatured" defaultChecked={course?.isFeatured} className="h-4 w-4 rounded border-teal-300 text-teal-600" />
            Featured on homepage
          </label>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-ink/70">Enrollment cap (optional)</label>
              <input name="enrollmentCap" type="number" min={1} defaultValue={course?.enrollmentCap ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70">Enrollment opens</label>
              <input name="enrollmentOpensAt" type="date" defaultValue={course?.enrollmentOpensAt?.slice(0, 10) ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70">Enrollment closes</label>
              <input name="enrollmentClosesAt" type="date" defaultValue={course?.enrollmentClosesAt?.slice(0, 10) ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          name="status"
          value="DRAFT"
          disabled={pending}
          className="rounded-full border border-teal-200 px-6 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
        >
          Save draft
        </button>
        <button
          type="submit"
          name="status"
          value="PUBLISHED"
          disabled={pending}
          className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
