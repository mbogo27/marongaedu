"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/settings", label: "General", exact: true },
  { href: "/admin/settings/emails", label: "Email templates" },
  { href: "/admin/settings/legal", label: "Legal pages" },
  { href: "/admin/settings/certificate", label: "Certificate" },
  { href: "/admin/settings/team", label: "Team" },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-full bg-teal-50 p-1 text-sm font-medium">
      {ITEMS.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 ${active ? "bg-white text-teal-900 shadow-sm" : "text-ink/80 hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
