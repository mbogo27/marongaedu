import type { ResolvedAttachment } from "@/lib/lesson-access";

export default function AttachmentList({ items, title = "Resources" }: { items: ResolvedAttachment[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="rounded-2xl border border-teal-100 bg-white p-5">
      <h2 className="font-serif text-lg text-teal-900">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((r) => (
          <li key={r.href}>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              {...(r.kind === "file" ? { download: r.filename ?? true } : {})}
              className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              {r.kind === "file" ? "⬇ " : "↗ "}
              {r.label}
              <span className="sr-only"> ({r.kind === "file" ? "download" : "opens in a new tab"})</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
