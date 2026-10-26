"use client";

import { useActionState, useState } from "react";
import { manualEnrollAction, type ManualEnrollState } from "@/lib/actions/admin/enrollments";

export default function ManualEnrollForm({ courses, presetEmail }: { courses: { id: string; title: string }[]; presetEmail?: string }) {
  const [state, action, pending] = useActionState<ManualEnrollState, FormData>(manualEnrollAction, undefined);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
      >
        {open ? "Close" : "+ Manual enroll"}
      </button>
      {open && (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-teal-100 bg-white p-4">
          <label className="text-xs font-medium text-ink/80">
            Student email
            <input name="email" type="email" required defaultValue={presetEmail} className="mt-1 block rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </label>
          <label className="text-xs font-medium text-ink/80">
            Course
            <select name="courseId" required className="mt-1 block rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30">
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {pending ? "Enrolling…" : "Enroll"}
          </button>
          <p className="w-full text-xs text-ink/70">Grants access without payment and ignores the enrollment cap and dates.</p>
          {state?.error && <p role="alert" className="w-full text-sm text-red-700">{state.error}</p>}
          {state?.success && <p role="status" className="w-full text-sm text-teal-800">{state.success}</p>}
        </form>
      )}
    </div>
  );
}
