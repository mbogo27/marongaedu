import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getSetting } from "@/lib/settings";
import UserMenu from "./UserMenu";

export default async function SiteHeader() {
  const [user, general] = await Promise.all([getCurrentUser(), getSetting("general")]);
  const [first, ...rest] = general.siteName.split(" ");

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 font-serif text-lg text-paper">
            {first.charAt(0)}
          </span>
          <span className="font-serif text-xl tracking-tight text-teal-900">{first}</span>
          <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 sm:inline">
            {rest.join(" ") || general.tagline.slice(0, 20)}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink/80 md:flex">
          <Link href="/courses" className="hover:text-teal-700">
            Courses
          </Link>
          <Link href="/about" className="hover:text-teal-700">
            About
          </Link>
          <Link href="/contact" className="hover:text-teal-700">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu name={user.name} avatarUrl={user.avatarUrl} isAdmin={user.role === "ADMIN"} />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 sm:inline-block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-gold-400"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
