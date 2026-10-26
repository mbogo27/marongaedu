"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All levels" },
];

const DURATIONS = [
  { value: "", label: "Any duration" },
  { value: "short", label: "Under 2 hours" },
  { value: "medium", label: "2–5 hours" },
  { value: "long", label: "5–10 hours" },
  { value: "xlong", label: "10+ hours" },
];

const RATINGS = [
  { value: "", label: "Any rating" },
  { value: "4", label: "4★ & up" },
  { value: "3", label: "3★ & up" },
];

const box = "h-4 w-4 rounded border-teal-300 text-teal-700 focus:ring-teal-500";
const field = "w-full rounded-lg border border-teal-200 px-3 py-2 text-sm";

/** Filters live in the URL (server-side filtering, shareable, back-button safe) — spec §5.1. */
export default function CourseFiltersPanel({
  categories,
  hideCategoryFilter,
}: {
  categories: { slug: string; name: string }[];
  hideCategoryFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleMulti(key: string, value: string) {
    update((params) => {
      const current = new Set(params.getAll(key));
      if (current.has(value)) current.delete(value);
      else current.add(value);
      params.delete(key);
      current.forEach((v) => params.append(key, v));
    });
  }

  function setSingle(key: string, value: string) {
    update((params) => (value ? params.set(key, value) : params.delete(key)));
  }

  const selectedCategories = new Set(searchParams.getAll("category"));
  const selectedLevels = new Set(searchParams.getAll("level"));

  const body = (
    <div className="space-y-6">
      {!hideCategoryFilter && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ink">Category</legend>
          <div className="space-y-2">
            {categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 text-sm text-ink/80">
                <input type="checkbox" checked={selectedCategories.has(c.slug)} onChange={() => toggleMulti("category", c.slug)} className={box} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">Level</legend>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <label key={l.value} className="flex items-center gap-2 text-sm text-ink/80">
              <input type="checkbox" checked={selectedLevels.has(l.value)} onChange={() => toggleMulti("level", l.value)} className={box} />
              {l.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">Price</legend>
        <div className="space-y-2">
          {[
            { value: "", label: "All" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ].map((p) => (
            <label key={p.value} className="flex items-center gap-2 text-sm text-ink/80">
              <input type="radio" name="price" checked={(searchParams.get("price") ?? "") === p.value} onChange={() => setSingle("price", p.value)} className={box} />
              {p.label}
            </label>
          ))}
        </div>
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            update((params) => {
              for (const k of ["minPrice", "maxPrice"] as const) {
                const v = String(fd.get(k) ?? "");
                if (v) params.set(k, v);
                else params.delete(k);
              }
            });
          }}
        >
          <label className="text-xs text-ink/80">
            Min (KES)
            <input name="minPrice" type="number" min={0} defaultValue={searchParams.get("minPrice") ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-ink/80">
            Max (KES)
            <input name="maxPrice" type="number" min={0} defaultValue={searchParams.get("maxPrice") ?? ""} className={`${field} mt-1`} />
          </label>
          <button type="submit" className="rounded-lg bg-teal-100 px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-200">
            Go
          </button>
        </form>
      </fieldset>

      <div>
        <label htmlFor="f-duration" className="mb-3 block text-sm font-semibold text-ink">
          Duration
        </label>
        <select id="f-duration" value={searchParams.get("duration") ?? ""} onChange={(e) => setSingle("duration", e.target.value)} className={field}>
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-rating" className="mb-3 block text-sm font-semibold text-ink">
          Rating
        </label>
        <select id="f-rating" value={searchParams.get("minRating") ?? ""} onChange={(e) => setSingle("minRating", e.target.value)} className={field}>
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={() => router.push(pathname)} className="text-sm font-medium text-teal-800 underline underline-offset-2">
        Clear all filters
      </button>
    </div>
  );

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-haspopup="dialog"
          className="rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-800 shadow-sm"
        >
          Filters
        </button>
      </div>

      <aside aria-label="Filters" className="hidden shrink-0 lg:block lg:w-64">
        <div className="sticky top-24 rounded-2xl border border-teal-100 bg-white p-5">{body}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="flex-1 bg-teal-950/50" onClick={() => setMobileOpen(false)} />
          <div className="w-80 max-w-[85vw] overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg text-teal-900">Filters</h2>
              <button ref={closeRef} type="button" onClick={() => setMobileOpen(false)} aria-label="Close filters" className="rounded px-2 py-1 hover:bg-teal-50">
                ✕
              </button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  );
}
