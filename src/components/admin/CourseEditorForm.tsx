"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveCourseAction } from "@/lib/actions/admin/courses";
import { publishChecklist, type CoursePayload, type EditorCoupon, type EditorInitial } from "@/lib/course-schema";
import { slugify } from "@/lib/format";
import DynamicListEditor from "./DynamicListEditor";
import RichTextEditor from "./RichTextEditor";
import FileUploadField from "./FileUploadField";
import CurriculumBuilder from "./CurriculumBuilder";

const TABS = ["basics", "media", "curriculum", "pricing", "seo", "settings"] as const;
type Tab = (typeof TABS)[number];

const AUTOSAVE_MS = 3000;

const input =
  "mt-1 w-full rounded-lg border border-teal-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";
const label = "text-sm font-medium text-ink/80";
const card = "space-y-5 rounded-2xl border border-teal-100 bg-white p-6";

type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; message: string };

export default function CourseEditorForm({
  initial,
  categories,
  coupons,
  initialTab = "basics",
}: {
  initial: EditorInitial;
  categories: { id: string; name: string }[];
  coupons: EditorCoupon[];
  initialTab?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t === initialTab) ?? "basics");
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  const [data, setData] = useState<CoursePayload>(initial.payload);
  const [courseId, setCourseId] = useState<string | null>(initial.id);
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [status, setStatus] = useState(initial.status);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [retryTick, setRetryTick] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial.payload));
  const saving = useRef(false);
  const queued = useRef<"autosave" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  }, [data]);

  const dirty = JSON.stringify(data) !== savedJson;
  const checklist = useMemo(() => publishChecklist(data), [data]);
  const requiredMissing = checklist.filter((c) => c.required && !c.ok);

  const patch = useCallback((p: Partial<CoursePayload>) => setData((d) => ({ ...d, ...p })), []);

  const doSave = useCallback(
    async (intent: "autosave" | "save" | "publish" | "unpublish") => {
      if (saving.current) {
        if (intent === "autosave") queued.current = "autosave";
        return;
      }
      saving.current = true;
      setSaveStatus({ kind: "saving" });
      const snapshot = latest.current;
      const payload = { ...snapshot, slug: snapshot.slug || slugify(snapshot.title) };
      try {
        const res = await saveCourseAction(courseId, payload, intent);
        if (!res.ok) {
          setSaveStatus({ kind: "error", message: res.error });
          if (intent !== "autosave") setMessage({ tone: "error", text: res.error });
          return;
        }
        setCourseId(res.course.id);
        setSavedSlug(res.course.slug);
        setStatus(res.course.status);
        // Server may have adjusted the slug (uniqueness) or status (publish/unpublish).
        setData((d) => ({ ...d, slug: res.course.slug, status: res.course.status }));
        setSavedJson(JSON.stringify({ ...snapshot, slug: res.course.slug, status: res.course.status }));
        setSaveStatus({ kind: "saved", at: new Date() });
        if (intent !== "autosave") {
          setMessage({ tone: "ok", text: intent === "publish" ? "Published. The course is live." : intent === "unpublish" ? "Unpublished." : "Saved." });
        }
        // A brand-new course moves from /new to its own URL. That is a real navigation (the page tree
        // remounts), so only do it when nothing was typed while the save was in flight.
        if (window.location.pathname.endsWith("/courses/new")) {
          if (JSON.stringify(latest.current) === JSON.stringify(snapshot)) router.replace(`/admin/courses/${res.course.slug}?tab=${tabRef.current}`);
        } else if (window.location.pathname !== `/admin/courses/${res.course.slug}`) {
          // Renamed slug of an existing course: same page tree, so just keep the address bar (and router) in sync.
          window.history.replaceState(null, "", `/admin/courses/${res.course.slug}`);
        }
      } catch {
        setSaveStatus({ kind: "error", message: "Could not save. Check your connection." });
      } finally {
        saving.current = false;
        if (queued.current) {
          queued.current = null;
          setRetryTick((n) => n + 1); // edits arrived mid-save: let the autosave effect pick them up
        }
      }
    },
    [courseId, router]
  );

  // Debounced autosave (drafts only get created once there's a title + category).
  useEffect(() => {
    if (!dirty || !data.title.trim() || !data.categoryId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void doSave("autosave"), AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, dirty, doSave, retryTick]);

  // "Unsaved changes" guard: tab close/reload, and in-app link clicks.
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      if (!window.confirm("You have unsaved changes. Leave this page anyway?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const published = status === "PUBLISHED";
  const hasCategory = categories.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/courses" className="text-sm text-teal-800 underline-offset-2 hover:underline">
            ← All courses
          </Link>
          <h1 className="mt-1 font-serif text-2xl text-teal-900">{courseId ? "Edit course" : "New course"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p role="status" aria-live="polite" className="text-xs text-ink/70">
            {saveStatus.kind === "saving" && "Saving…"}
            {saveStatus.kind === "saved" && `Saved ${saveStatus.at.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`}
            {saveStatus.kind === "error" && <span className="text-red-700">{saveStatus.message}</span>}
            {saveStatus.kind === "idle" && (dirty ? "Unsaved changes" : "")}
            {saveStatus.kind === "saved" && dirty && " · unsaved changes"}
          </p>
          {courseId && (
            <Link
              href={`/courses/${savedSlug}`}
              target="_blank"
              className="rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
            >
              Preview<span className="sr-only"> (opens in a new tab)</span> →
            </Link>
          )}
        </div>
      </div>

      {!hasCategory && (
        <p role="alert" className="rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-900">
          Create at least one category under <Link className="underline" href="/admin/categories">Categories</Link> before saving a course.
        </p>
      )}

      <div role="tablist" aria-label="Course sections" className="flex gap-1 overflow-x-auto rounded-full bg-teal-50 p-1 text-sm font-medium">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 capitalize transition ${tab === t ? "bg-white text-teal-900 shadow-sm" : "text-ink/80 hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* BASICS */}
      <div role="tabpanel" id="panel-basics" aria-labelledby="tab-basics" hidden={tab !== "basics"}>
        <div className={card}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="c-title" className={label}>Title</label>
              <input
                id="c-title"
                value={data.title}
                onChange={(e) => patch({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                required
                className={input}
              />
            </div>
            <div>
              <label htmlFor="c-slug" className={label}>URL slug</label>
              <input
                id="c-slug"
                value={data.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  patch({ slug: slugify(e.target.value) });
                }}
                placeholder="auto-generated from the title"
                className={input}
              />
              {courseId && data.slug && data.slug !== savedSlug && (
                <p className="mt-1 text-xs text-ink/70">The old URL will redirect to the new one.</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="c-sub" className={label}>Subtitle</label>
            <input id="c-sub" value={data.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} className={input} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="c-cat" className={label}>Category</label>
              <select id="c-cat" value={data.categoryId} onChange={(e) => patch({ categoryId: e.target.value })} className={input}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-level" className={label}>Level</label>
              <select id="c-level" value={data.level} onChange={(e) => patch({ level: e.target.value as CoursePayload["level"] })} className={input}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="ALL_LEVELS">All levels</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-lang" className={label}>Language</label>
              <input id="c-lang" value={data.language} onChange={(e) => patch({ language: e.target.value })} className={input} />
            </div>
          </div>
          <div>
            <label htmlFor="c-short" className={label}>Short description (~160 characters, used on cards)</label>
            <textarea id="c-short" value={data.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })} maxLength={200} rows={2} className={input} />
            <p className="mt-1 text-xs text-ink/70">{data.shortDescription.length}/200</p>
          </div>
          <div>
            <span className={label}>Full description</span>
            <div className="mt-1">
              <RichTextEditor content={data.description} onChange={(html) => patch({ description: html })} label="Course description" />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <DynamicListEditor label="What you'll learn" placeholder="Outcome" items={data.outcomes} onChange={(outcomes) => patch({ outcomes })} />
            <DynamicListEditor label="Requirements" placeholder="Requirement" items={data.requirements} onChange={(requirements) => patch({ requirements })} />
            <DynamicListEditor label="Target audience" placeholder="Audience" items={data.audience} onChange={(audience) => patch({ audience })} />
          </div>
        </div>
      </div>

      {/* MEDIA */}
      <div role="tabpanel" id="panel-media" aria-labelledby="tab-media" hidden={tab !== "media"}>
        <div className={`${card} grid gap-6 sm:grid-cols-2`}>
          <div>
            <span className={label}>Thumbnail (1280×720 recommended)</span>
            <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-xl border border-teal-100 bg-teal-50">
              {data.thumbnailUrl && <Image src={data.thumbnailUrl} alt="Current thumbnail" fill sizes="480px" className="object-cover" unoptimized={data.thumbnailUrl.startsWith("/media")} />}
            </div>
            <div className="mt-3">
              <FileUploadField target="thumbnail" accept="image/jpeg,image/png,image/webp" label="Upload thumbnail" buttonText="Upload image" onUploaded={(f) => patch({ thumbnailUrl: f.url })} />
            </div>
            <label htmlFor="c-thumb-url" className="mt-3 block text-xs font-medium text-ink/80">Or paste an image URL</label>
            <input id="c-thumb-url" value={data.thumbnailUrl} onChange={(e) => patch({ thumbnailUrl: e.target.value })} placeholder="https://…" className={input} />
          </div>
          <div>
            <span className={label}>Intro video</span>
            <p className="mt-1 text-xs text-ink/70">Shown on the course page. Upload an MP4 or paste a YouTube / Vimeo link.</p>
            <div className="mt-3">
              <FileUploadField target="previewVideo" accept="video/mp4,video/webm" label="Upload intro video" buttonText="Upload video" onUploaded={(f) => patch({ previewVideoUrl: f.url })} />
            </div>
            <label htmlFor="c-prev-url" className="mt-3 block text-xs font-medium text-ink/80">Video URL</label>
            <input id="c-prev-url" value={data.previewVideoUrl} onChange={(e) => patch({ previewVideoUrl: e.target.value })} placeholder="https://… or /media/public/…" className={input} />
          </div>
        </div>
      </div>

      {/* CURRICULUM */}
      <div role="tabpanel" id="panel-curriculum" aria-labelledby="tab-curriculum" hidden={tab !== "curriculum"}>
        <div className="rounded-2xl border border-teal-100 bg-white p-6">
          <CurriculumBuilder modules={data.modules} onChange={(next) => setData((d) => ({ ...d, modules: typeof next === "function" ? next(d.modules) : next }))} />
        </div>
      </div>

      {/* PRICING */}
      <div role="tabpanel" id="panel-pricing" aria-labelledby="tab-pricing" hidden={tab !== "pricing"}>
        <div className={card}>
          <label className="flex items-center gap-2 text-sm font-medium text-ink/80">
            <input type="checkbox" checked={data.isFree} onChange={(e) => patch({ isFree: e.target.checked })} className="h-4 w-4 rounded border-teal-300 text-teal-700" />
            This course is free
          </label>
          {!data.isFree && (
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="c-price" className={label}>Price (KES)</label>
                <input id="c-price" type="number" min={0} value={data.priceKes} onChange={(e) => patch({ priceKes: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className={input} />
              </div>
              <div>
                <label htmlFor="c-sale" className={label}>Sale price (KES, optional)</label>
                <input
                  id="c-sale"
                  type="number"
                  min={0}
                  value={data.salePriceKes ?? ""}
                  onChange={(e) => patch({ salePriceKes: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })}
                  className={input}
                />
              </div>
              <div>
                <label htmlFor="c-sale-end" className={label}>Sale ends</label>
                <input id="c-sale-end" type="date" value={data.saleEndsAt?.slice(0, 10) ?? ""} onChange={(e) => patch({ saleEndsAt: e.target.value || null })} className={input} />
              </div>
            </div>
          )}
          <fieldset>
            <legend className={label}>Applicable coupons</legend>
            <p className="mt-1 text-xs text-ink/70">Coupons restricted to specific courses can be switched on for this course here. Coupons with no restriction already apply everywhere.</p>
            <ul className="mt-3 space-y-2">
              {coupons.length === 0 && <li className="text-xs text-ink/70">No coupons yet. Create one under Coupons.</li>}
              {coupons.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm text-ink/80">
                    <input
                      type="checkbox"
                      disabled={!c.restricted}
                      checked={!c.restricted || data.couponIds.includes(c.id)}
                      onChange={(e) => patch({ couponIds: e.target.checked ? [...data.couponIds, c.id] : data.couponIds.filter((x) => x !== c.id) })}
                    />
                    <span className="font-mono text-xs">{c.code}</span>
                    <span className="text-xs text-ink/70">{c.restricted ? c.description : `${c.description} · applies to all courses`}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      </div>

      {/* SEO */}
      <div role="tabpanel" id="panel-seo" aria-labelledby="tab-seo" hidden={tab !== "seo"}>
        <div className={card}>
          <div>
            <label htmlFor="c-mt" className={label}>Meta title</label>
            <input id="c-mt" value={data.metaTitle} onChange={(e) => patch({ metaTitle: e.target.value })} maxLength={200} className={input} />
          </div>
          <div>
            <label htmlFor="c-md" className={label}>Meta description</label>
            <textarea id="c-md" value={data.metaDescription} onChange={(e) => patch({ metaDescription: e.target.value })} rows={2} maxLength={400} className={input} />
          </div>
          <div>
            <span className={label}>Social share image (defaults to the thumbnail)</span>
            <div className="mt-2">
              <FileUploadField target="ogImage" accept="image/jpeg,image/png,image/webp" label="Upload share image" buttonText="Upload image" current={data.ogImageUrl || undefined} onUploaded={(f) => patch({ ogImageUrl: f.url })} />
            </div>
            <input aria-label="Share image URL" value={data.ogImageUrl} onChange={(e) => patch({ ogImageUrl: e.target.value })} placeholder="https://…" className={input} />
          </div>
        </div>
      </div>

      {/* SETTINGS */}
      <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" hidden={tab !== "settings"}>
        <div className={card}>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="c-status" className={label}>Status</label>
              <select id="c-status" value={data.status} onChange={(e) => patch({ status: e.target.value as CoursePayload["status"] })} className={input}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-cert" className={label}>Certificate template</label>
              <select id="c-cert" value={data.certificateTemplate} onChange={(e) => patch({ certificateTemplate: e.target.value })} className={input}>
                <option value="default">Default (edit under Settings → Certificates)</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-ink/80">
            <input type="checkbox" checked={data.isFeatured} onChange={(e) => patch({ isFeatured: e.target.checked })} className="h-4 w-4 rounded border-teal-300 text-teal-700" />
            Featured on the homepage
          </label>
          <label className="flex items-start gap-2 text-sm font-medium text-ink/80">
            <input type="checkbox" checked={data.requireSequential} onChange={(e) => patch({ requireSequential: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-700" />
            <span>
              Require lessons in order
              <span className="block text-xs font-normal text-ink/70">Each lesson stays locked until the previous one is complete (quizzes must be passed).</span>
            </span>
          </label>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="c-cap" className={label}>Enrollment cap (optional)</label>
              <input id="c-cap" type="number" min={1} value={data.enrollmentCap ?? ""} onChange={(e) => patch({ enrollmentCap: e.target.value === "" ? null : Math.max(1, Math.round(Number(e.target.value))) })} className={input} />
            </div>
            <div>
              <label htmlFor="c-open" className={label}>Enrollment opens</label>
              <input id="c-open" type="date" value={data.enrollmentOpensAt?.slice(0, 10) ?? ""} onChange={(e) => patch({ enrollmentOpensAt: e.target.value || null })} className={input} />
            </div>
            <div>
              <label htmlFor="c-close" className={label}>Enrollment closes</label>
              <input id="c-close" type="date" value={data.enrollmentClosesAt?.slice(0, 10) ?? ""} onChange={(e) => patch({ enrollmentClosesAt: e.target.value || null })} className={input} />
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="checklist-h" className="rounded-2xl border border-teal-100 bg-white p-5">
        <h2 id="checklist-h" className="font-serif text-lg text-teal-900">Publish checklist</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className={c.ok ? "text-teal-700" : c.required ? "text-red-700" : "text-gold-700"}>
                {c.ok ? "✓" : c.required ? "✗" : "!"}
              </span>
              <span className={c.ok ? "text-ink/80" : "text-ink"}>
                {c.label}
                {!c.ok && !c.required && <span className="text-xs text-ink/70"> (recommended)</span>}
                <span className="sr-only">{c.ok ? " — done" : c.required ? " — required, missing" : " — recommended"}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${message.tone === "error" ? "bg-red-50 text-red-800" : "bg-teal-50 text-teal-900"}`}>
          {message.text}
        </p>
      )}

      <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center gap-3 border-t border-teal-100 bg-white/95 px-2 py-3 backdrop-blur">
        <button
          type="button"
          disabled={!hasCategory || !data.title.trim() || saveStatus.kind === "saving"}
          onClick={() => void doSave("save")}
          className="rounded-full border border-teal-300 px-6 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60"
        >
          {published ? "Save changes" : "Save draft"}
        </button>
        {published ? (
          <button
            type="button"
            disabled={saveStatus.kind === "saving"}
            onClick={() => void doSave("unpublish")}
            className="rounded-full border border-gold-500 px-6 py-2.5 text-sm font-semibold text-gold-900 hover:bg-gold-50 disabled:opacity-60"
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            disabled={!hasCategory || requiredMissing.length > 0 || saveStatus.kind === "saving"}
            onClick={() => void doSave("publish")}
            className="rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
            title={requiredMissing.length ? `Missing: ${requiredMissing.map((m) => m.label).join(", ")}` : undefined}
          >
            Publish
          </button>
        )}
        {!published && requiredMissing.length > 0 && <span className="text-xs text-ink/70">Complete the required checklist items to publish.</span>}
      </div>
    </div>
  );
}
