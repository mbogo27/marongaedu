"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Accessible modal: focus moves in, Escape closes, backdrop click closes, scroll is contained. */
export default function Modal({
  trigger,
  title,
  children,
  triggerClassName = "text-xs font-medium text-teal-800 underline-offset-2 hover:underline",
}: {
  trigger: ReactNode;
  title: string;
  children: (close: () => void) => ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    el?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && el) {
        const focusable = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea')];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const opening = opener.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      opening?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" className={triggerClassName} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 py-8" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div ref={dialog} role="dialog" aria-modal="true" aria-label={title} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-lg text-teal-900">{title}</h2>
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}
