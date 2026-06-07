"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/students", label: "Students" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-1 bg-teal-50/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-teal-100 bg-white px-5 py-6 md:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 font-serif text-lg text-paper">
            M
          </span>
          <div>
            <p className="font-serif text-lg leading-tight text-teal-900">Maronga</p>
            <p className="text-xs text-ink/50">Admin back office</p>
          </div>
        </Link>

        <nav className="mt-8 flex flex-col gap-1 text-sm font-medium">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 transition ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-ink/70 hover:bg-teal-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-teal-100 pt-4 text-sm">
          <Link href="/" className="rounded-lg px-3 py-2 font-medium text-ink/70 hover:bg-teal-50">
            ← View live site
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg px-3 py-2 font-medium text-ink/50 hover:bg-teal-50"
          >
            Log out
          </Link>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-teal-100 bg-white px-6 py-4 md:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 font-serif text-paper">
              M
            </span>
            <span className="font-serif text-lg text-teal-900">Maronga Admin</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-teal-600">
            View site
          </Link>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-teal-100 bg-white px-4 py-2 text-sm font-medium md:hidden">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 ${
                  active ? "bg-teal-600 text-white" : "text-ink/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
