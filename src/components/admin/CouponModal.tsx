"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import Modal from "./Modal";
import { saveCouponAction, type CouponState } from "@/lib/actions/admin/coupons";

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

const input = "mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

function CouponFormBody({ coupon, courses, close }: { coupon?: Coupon; courses: { id: string; title: string }[]; close: () => void }) {
  const [state, action, pending] = useActionState<CouponState, FormData>(saveCouponAction.bind(null, coupon?.id ?? null), undefined);
  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);
  const selected = new Set(coupon?.courses.map((c) => c.courseId) ?? []);

  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-xs font-medium text-ink/80">
        Code
        <input name="code" defaultValue={coupon?.code} required className={`${input} uppercase`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-ink/80">
          Discount type
          <select name="discountType" defaultValue={coupon?.discountType ?? "PERCENT"} className={input}>
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED">Fixed (KES)</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-ink/80">
          Value
          <input name="discountValue" type="number" min={1} defaultValue={coupon?.discountValue ?? 10} required className={input} />
        </label>
        <label className="block text-xs font-medium text-ink/80">
          Total usage limit
          <input name="usageLimit" type="number" min={0} defaultValue={coupon?.usageLimit ?? ""} className={input} />
        </label>
        <label className="block text-xs font-medium text-ink/80">
          Per-user limit
          <input name="perUserLimit" type="number" min={0} defaultValue={coupon?.perUserLimit ?? ""} className={input} />
        </label>
        <label className="block text-xs font-medium text-ink/80">
          Starts
          <input name="startsAt" type="date" defaultValue={coupon?.startsAt?.toISOString().slice(0, 10) ?? ""} className={input} />
        </label>
        <label className="block text-xs font-medium text-ink/80">
          Ends
          <input name="endsAt" type="date" defaultValue={coupon?.endsAt?.toISOString().slice(0, 10) ?? ""} className={input} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true} className="h-4 w-4 rounded border-teal-300" />
        Active
      </label>
      <fieldset>
        <legend className="text-xs font-medium text-ink/80">Applicable courses (none ticked = all courses)</legend>
        <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-teal-200 p-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 py-1 text-sm text-ink/80">
              <input type="checkbox" name="courseIds" value={c.id} defaultChecked={selected.has(c.id)} className="h-4 w-4 rounded border-teal-300" />
              {c.title}
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="flex-1 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={close} className="flex-1 rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-ink/80 hover:bg-teal-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CouponModal({
  coupon,
  courses,
  trigger,
  triggerClassName,
}: {
  coupon?: Coupon;
  courses: { id: string; title: string }[];
  trigger: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <Modal title={coupon ? "Edit coupon" : "New coupon"} trigger={trigger} triggerClassName={triggerClassName}>
      {(close) => <CouponFormBody coupon={coupon} courses={courses} close={close} />}
    </Modal>
  );
}
