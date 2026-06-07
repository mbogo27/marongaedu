import NewsletterForm from "./NewsletterForm";

export default function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-teal-100 bg-teal-900 text-teal-50">
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
          <p className="mt-2 text-xs text-teal-100/50">
            Course announcements only — no spam. (Demo: this form doesn&apos;t send anywhere yet.)
          </p>
        </div>

        <div id="about">
          <h3 className="font-serif text-base text-gold-300">About</h3>
          <ul className="mt-4 space-y-2 text-sm text-teal-100/80">
            <li>Dr. Godfrey Maronga</li>
            <li>Practicing clinician, Nairobi</li>
            <li>15+ years in clinical dentistry</li>
            <li>Founder, Maronga Dental Academy</li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-base text-gold-300">Get in touch</h3>
          <ul className="mt-4 space-y-2 text-sm text-teal-100/80">
            <li>hello@marongadental.ac.ke</li>
            <li>+254 7XX XXX XXX</li>
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
        © {new Date().getFullYear()} Maronga Dental Academy. Demo build — content and pricing shown for illustration.
      </div>
    </footer>
  );
}
