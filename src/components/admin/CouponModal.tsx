"use client";

import { useState } from "react";
import { saveCouponAction } from "@/lib/actions/admin/coupons";

type Coupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  courses: { courseId: string }[];
};

export default function CouponModal({
  coupon,
  courses,
  trigger,
}: {
  coupon?: Coupon;
  courses: { id: string; title: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = saveCouponAction.bind(null, coupon?.id ?? null);
  const selectedCourseIds = new Set(coupon?.courses.map((c) => c.courseId) ?? []);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 py-8" onClick={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await action(fd);
              setOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="font-serif text-lg text-teal-900">{coupon ? "Edit coupon" : "New coupon"}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-ink/60">Code</label>
                <input name="code" defaultValue={coupon?.code} required className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm uppercase focus:border-teal-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink/60">Discount type</label>
                  <select name="discountType" defaultValue={coupon?.discountType ?? "PERCENT"} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none">
                    <option value="PERCENT">Percent (%)</option>
                    <option value="FIXED">Fixed (KES)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/60">Value</label>
                  <input name="discountValue" type="number" min={0} defaultValue={coupon?.discountValue ?? 10} required className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink/60">Usage limit (total)</label>
                  <input name="usageLimit" type="number" min={0} defaultValue={coupon?.usageLimit ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/60">Per-user limit</label>
                  <input name="perUserLimit" type="number" min={0} defaultValue={coupon?.perUserLimit ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink/60">Starts</label>
                  <input name="startsAt" type="date" defaultValue={coupon?.startsAt?.toISOString().slice(0, 10) ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/60">Ends</label>
                  <input name="endsAt" type="date" defaultValue={coupon?.endsAt?.toISOString().slice(0, 10) ?? ""} className="mt-1 w-full rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink/80">
                <input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true} className="h-4 w-4 rounded border-teal-300 text-teal-600" />
                Active
              </label>
              <div>
                <label className="text-xs font-medium text-ink/60">Applicable courses (none = all courses)</label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-teal-100 p-2">
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm text-ink/80">
                      <input type="checkbox" name="courseIds" value={c.id} defaultChecked={selectedCourseIds.has(c.id)} className="h-4 w-4 rounded border-teal-300 text-teal-600" />
                      {c.title}
                    </label>
                  ))}
                </div>
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
