import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { sanitizeRichText } from "@/lib/sanitize";

export default function LegalPageLayout({ title, html }: { title: string; html: string }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-serif text-3xl text-teal-900">{title}</h1>
          <div
            className="mt-6 max-w-none text-sm leading-relaxed text-ink/80 [&_a]:text-teal-800 [&_a]:underline [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-teal-900 [&_h3]:mt-4 [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
