"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";

export default function UserMenu({ name, avatarUrl, isAdmin }: { name: string; avatarUrl?: string | null; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-teal-100 py-1 pl-1 pr-3 text-sm font-medium text-ink/80 hover:bg-teal-50"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="hidden sm:inline">{name.split(" ")[0]}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-teal-100 bg-white py-1 shadow-lg">
          {isAdmin && (
            <Link href="/admin" className="block px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          <Link href="/dashboard" className="block px-4 py-2 text-sm text-ink/80 hover:bg-teal-50" onClick={() => setOpen(false)}>
            Dashboard
          </Link>
          <Link href="/account" className="block px-4 py-2 text-sm text-ink/80 hover:bg-teal-50" onClick={() => setOpen(false)}>
            Account
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-teal-50">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
