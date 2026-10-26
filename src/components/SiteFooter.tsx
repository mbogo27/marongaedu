import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import { getSetting } from "@/lib/settings";
import { isSimulatedPayments } from "@/lib/payments";

export default async function SiteFooter() {
  const general = await getSetting("general");
  const social = Object.entries(general.social).filter(([, url]) => !!url);
  const initial = general.siteName.charAt(0).toUpperCase();

  return (
    <footer className="border-t border-teal-100 bg-teal-900 text-teal-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 font-serif text-lg text-teal-900" aria-hidden="true">
              {initial}
            </span>
            <span className="font-serif text-xl">{general.siteName}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-teal-100">{general.tagline}</p>
          <NewsletterForm />
          <p className="mt-2 text-xs text-teal-100">Course announcements only. Unsubscribe any time.</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-serif text-base text-gold-200">Company</h2>
          <ul className="mt-4 space-y-2 text-sm text-teal-100">
            <li><Link href="/about" className="hover:text-gold-200">About</Link></li>
            <li><Link href="/contact" className="hover:text-gold-200">Contact</Link></li>
            <li><Link href="/faq" className="hover:text-gold-200">FAQ</Link></li>
            <li><Link href="/courses" className="hover:text-gold-200">Courses</Link></li>
          </ul>
          <h2 className="mt-6 font-serif text-base text-gold-200">Legal</h2>
          <ul className="mt-4 space-y-2 text-sm text-teal-100">
            <li><Link href="/terms" className="hover:text-gold-200">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-gold-200">Privacy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-gold-200">Refund Policy</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-serif text-base text-gold-200">Get in touch</h2>
          <ul className="mt-4 space-y-2 text-sm text-teal-100">
            {general.contactEmail && <li>{general.contactEmail}</li>}
            {general.phone && <li>{general.phone}</li>}
            {general.address && <li>{general.address}</li>}
          </ul>
          {social.length > 0 && (
            <>
              <h2 className="mt-6 font-serif text-base text-gold-200">Follow</h2>
              <ul className="mt-4 flex flex-wrap gap-3 text-sm text-teal-100">
                {social.map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-teal-600 px-3 py-1 capitalize hover:border-gold-400 hover:text-gold-200">
                      {name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-teal-700/60 px-6 py-5 text-center text-xs text-teal-100">
        © {new Date().getFullYear()} {general.siteName}.{isSimulatedPayments() ? " Demo mode: no real payments are processed." : ""}
      </div>
    </footer>
  );
}
