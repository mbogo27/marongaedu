"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
];

export default function CourseSortSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("search", search);
        }}
        className="flex w-full max-w-sm items-center gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses, topics, lessons..."
          className="w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm focus:border-teal-400 focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          Search
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        Sort by
        <select
          value={searchParams.get("sort") ?? "popular"}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="rounded-lg border border-teal-100 px-3 py-2 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
