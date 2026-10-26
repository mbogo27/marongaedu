import Link from "next/link";

const TABS = [
  { key: "courses", label: "My Courses" },
  { key: "wishlist", label: "Wishlist" },
  { key: "certificates", label: "Certificates" },
];

export default function DashboardNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-full bg-teal-50 p-1 text-sm font-medium">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/dashboard?tab=${tab.key}`}
          className={`shrink-0 rounded-full px-4 py-2 transition ${
            active === tab.key ? "bg-white text-teal-700 shadow-sm" : "text-ink/70 hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
      <Link href="/account" className="shrink-0 rounded-full px-4 py-2 text-ink/70 transition hover:text-ink">
        Account &amp; purchases
      </Link>
    </nav>
  );
}
