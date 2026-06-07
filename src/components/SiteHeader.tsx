import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-teal-100 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 font-serif text-lg text-paper">
            M
          </span>
          <span className="font-serif text-xl tracking-tight text-teal-900">
            Maronga
          </span>
          <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 sm:inline">
            Dental Academy
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink/80 md:flex">
          <Link href="/#courses" className="hover:text-teal-700">
            Courses
          </Link>
          <Link href="/#about" className="hover:text-teal-700">
            About
          </Link>
          <Link href="/#contact" className="hover:text-teal-700">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 sm:inline-block"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-gold-400"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
