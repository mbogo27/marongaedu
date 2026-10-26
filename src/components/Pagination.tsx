import Link from "next/link";

export default function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else if (value) params.set(key, value);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`rounded-full border px-3 py-1.5 text-sm ${page === 1 ? "pointer-events-none border-teal-50 text-ink/70" : "border-teal-100 text-teal-800 hover:bg-teal-50"}`}
      >
        Previous
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm ${p === page ? "bg-teal-700 text-white" : "text-ink/70 hover:bg-teal-50"}`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`rounded-full border px-3 py-1.5 text-sm ${page === totalPages ? "pointer-events-none border-teal-50 text-ink/70" : "border-teal-100 text-teal-800 hover:bg-teal-50"}`}
      >
        Next
      </Link>
    </nav>
  );
}
