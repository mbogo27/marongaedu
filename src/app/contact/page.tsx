import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ContactForm from "@/components/ContactForm";
import { getSetting } from "@/lib/settings";

export default async function ContactPage() {
  const general = await getSetting("general");
  const whatsappNumber = general.phone.replace(/\D/g, "");

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-[1fr_320px]">
          <div>
            <h1 className="font-serif text-3xl text-teal-900">Get in touch</h1>
            <p className="mt-2 text-ink/80">Questions about a course, group pricing, or accreditation? Send us a message.</p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-white p-6">
              <h2 className="font-serif text-lg text-teal-900">Contact details</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink/80">
                <li>{general.contactEmail}</li>
                <li>{general.phone}</li>
                <li>{general.address}</li>
              </ul>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Chat on WhatsApp
              </a>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
