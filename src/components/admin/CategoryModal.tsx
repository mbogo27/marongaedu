"use client";

import { useState } from "react";
import { saveCategoryAction } from "@/lib/actions/admin/categories";

type Category = { id: string; name: string; slug: string; description: string | null; iconUrl: string | null; sortOrder: number };

export default function CategoryModal({ category, trigger }: { category?: Category; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const action = saveCategoryAction.bind(null, category?.id ?? null);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4" onClick={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await action(fd);
              setOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="font-serif text-lg text-teal-900">{category ? "Edit category" : "New category"}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-ink/60">Name</label>
                <input name="name" defaultValue={category?.name} required className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Slug (optional, auto from name)</label>
                <input name="slug" defaultValue={category?.slug} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Description</label>
                <textarea name="description" defaultValue={category?.description ?? ""} rows={2} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Icon (name or URL)</label>
                <input name="iconUrl" defaultValue={category?.iconUrl ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Sort order</label>
                <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" className="flex-1 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                Save
              </button>
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full border border-teal-100 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-teal-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
