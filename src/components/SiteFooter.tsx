import Link from "next/link";
import NewsletterForm from "./NewsletterForm";

export default function SiteFooter() {
  return (
    <footer className="border-t border-teal-100 bg-teal-900 text-teal-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 font-serif text-lg text-teal-900">
              M
            </span>
            <span className="font-serif text-xl">Maronga Dental Academy</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-teal-100/80">
            Authoritative dental education from a practicing clinician —
            built for students and practitioners across Kenya who want
            training that holds up at the chairside, not just on paper.
          </p>
          <NewsletterForm />
          <p className="mt-2 text-xs text-teal-100/50">Course announcements only — no spam.</p>
        </div>

        <div>
          <h3 className="font-serif text-base text-gold-300">Company</h3>
          <ul className="mt-4 space-y-2 text-sm text-teal-100/80">
            <li><Link href="/about" className="hover:text-gold-300">About</Link></li>
            <li><Link href="/contact" className="hover:text-gold-300">Contact</Link></li>
            <li><Link href="/faq" className="hover:text-gold-300">FAQ</Link></li>
            <li><Link href="/courses" className="hover:text-gold-300">Courses</Link></li>
          </ul>
          <h3 className="mt-6 font-serif text-base text-gold-300">Legal</h3>
          <ul className="mt-4 space-y-2 text-sm text-teal-100/80">
            <li><Link href="/terms" className="hover:text-gold-300">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-gold-300">Privacy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-gold-300">Refund Policy</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-base text-gold-300">Get in touch</h3>
          <ul className="mt-4 space-y-2 text-sm text-teal-100/80">
            <li>hello@marongadental.ac.ke</li>
            <li>+254 700 000 000</li>
            <li>Nairobi, Kenya</li>
          </ul>
          <h3 className="mt-6 font-serif text-base text-gold-300">Follow</h3>
          <ul className="mt-4 flex gap-3 text-sm text-teal-100/80">
            <li>
              <a href="#" className="rounded-full border border-teal-700 px-3 py-1 hover:border-gold-400 hover:text-gold-300">
                YouTube
              </a>
            </li>
            <li>
              <a href="#" className="rounded-full border border-teal-700 px-3 py-1 hover:border-gold-400 hover:text-gold-300">
                Instagram
              </a>
            </li>
            <li>
              <a href="#" className="rounded-full border border-teal-700 px-3 py-1 hover:border-gold-400 hover:text-gold-300">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-teal-700/60 px-6 py-5 text-center text-xs text-teal-100/50">
        © {new Date().getFullYear()} Maronga Dental Academy. Demo build — payments and messaging are simulated.
      </div>
    </footer>
  );
}
