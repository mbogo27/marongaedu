"use client";

import { useActionState, useState } from "react";
import { manualEnrollAction } from "@/lib/actions/admin/enrollments";

export default function ManualEnrollForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(manualEnrollAction, undefined as { error?: string } | undefined);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
        {open ? "Close" : "+ Manual enroll"}
      </button>
      {open && (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-teal-100 bg-white p-4">
          <div>
            <label className="text-xs font-medium text-ink/60">Student email</label>
            <input name="email" type="email" required className="mt-1 rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60">Course</label>
            <select name="courseId" required className="mt-1 rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none">
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={pending} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {pending ? "Enrolling…" : "Enroll"}
          </button>
          {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
