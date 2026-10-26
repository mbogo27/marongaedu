import Link from "next/link";
import type { ReactNode } from "react";

export const tableWrap = "overflow-x-auto rounded-2xl border border-teal-100 bg-white";
export const th = "px-4 py-3 font-medium";
export const td = "px-4 py-3";
export const filterInput = "rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";
export const filterButton = "rounded-lg bg-teal-100 px-4 py-2 text-sm font-medium text-teal-900 hover:bg-teal-200";
export const linkBtn = "text-xs font-medium text-teal-800 underline-offset-2 hover:underline";
export const dangerBtn = "text-xs font-medium text-red-700 underline-offset-2 hover:underline";

const TONES = {
  good: "bg-teal-50 text-teal-900",
  bad: "bg-red-50 text-red-800",
  warn: "bg-gold-50 text-gold-900",
  muted: "bg-ink/5 text-ink/80",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function statusTone(status: string): keyof typeof TONES {
  switch (status) {
    case "SUCCESS":
    case "PUBLISHED":
    case "ACTIVE":
    case "SENT":
      return "good";
    case "FAILED":
    case "SUSPENDED":
    case "REVOKED":
      return "bad";
    case "PENDING":
    case "DRAFT":
    case "FLAGGED":
      return "warn";
    default:
      return "muted";
  }
}

/** Prev / next links preserving the other query params. */
export function Pager({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("page", String(p));
    return `${basePath}?${q}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkBtn}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink/70">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkBtn}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      {actions}
    </div>
  );
}
