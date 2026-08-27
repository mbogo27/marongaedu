"use client";

import { useState } from "react";
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

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
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
    update((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  const selectedCategories = new Set(searchParams.getAll("category"));
  const selectedLevels = new Set(searchParams.getAll("level"));

  const body = (
    <div className="space-y-6">
      {!hideCategoryFilter && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Category</h3>
          <div className="space-y-2">
            {categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 text-sm text-ink/80">
                <input
                  type="checkbox"
                  checked={selectedCategories.has(c.slug)}
                  onChange={() => toggleMulti("category", c.slug)}
                  className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Level</h3>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <label key={l.value} className="flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={selectedLevels.has(l.value)}
                onChange={() => toggleMulti("level", l.value)}
                className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Price</h3>
        <div className="space-y-2">
          {[
            { value: "", label: "All" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ].map((p) => (
            <label key={p.value} className="flex items-center gap-2 text-sm text-ink/80">
              <input
                type="radio"
                name="price"
                checked={(searchParams.get("price") ?? "") === p.value}
                onChange={() => setSingle("price", p.value)}
                className="h-4 w-4 border-teal-300 text-teal-600 focus:ring-teal-500"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Duration</h3>
        <select
          value={searchParams.get("duration") ?? ""}
          onChange={(e) => setSingle("duration", e.target.value)}
          className="w-full rounded-lg border border-teal-100 px-3 py-2 text-sm"
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Rating</h3>
        <select
          value={searchParams.get("minRating") ?? ""}
          onChange={(e) => setSingle("minRating", e.target.value)}
          className="w-full rounded-lg border border-teal-100 px-3 py-2 text-sm"
        >
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="text-sm font-medium text-gold-600 hover:underline"
      >
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
          className="rounded-full border border-teal-100 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm"
        >
          Filters
        </button>
      </div>

      <aside className="hidden shrink-0 lg:block lg:w-64">
        <div className="sticky top-24 rounded-2xl border border-teal-100 bg-white p-5">{body}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-teal-950/50" onClick={() => setMobileOpen(false)} />
          <div className="w-80 max-w-[85vw] overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg text-teal-900">Filters</h2>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close filters">
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
