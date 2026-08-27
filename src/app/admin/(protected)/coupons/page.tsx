import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import CouponModal from "@/components/admin/CouponModal";
import { deleteCouponAction } from "@/lib/actions/admin/coupons";

export default async function AdminCouponsPage() {
  const [coupons, courses] = await Promise.all([
    db.coupon.findMany({
      include: { courses: true, usages: true },
      orderBy: { createdAt: "desc" },
    }),
    db.course.findMany({ orderBy: { title: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-teal-900">Coupons</h1>
        <CouponModal courses={courses} trigger={<button className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">+ New coupon</button>} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-teal-100 text-left text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Validity</th>
              <th className="px-4 py-3 font-medium">Uses</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {coupons.map((c) => {
              const expired = c.endsAt && c.endsAt < new Date();
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{c.code}</td>
                  <td className="px-4 py-3 text-ink/60">{c.discountType === "PERCENT" ? `${c.discountValue}%` : `KES ${c.discountValue}`}</td>
                  <td className="px-4 py-3 text-ink/60">{c.courses.length === 0 ? "All courses" : `${c.courses.length} course(s)`}</td>
                  <td className="px-4 py-3 text-ink/40">
                    {c.startsAt ? formatDate(c.startsAt) : "Any"} – {c.endsAt ? formatDate(c.endsAt) : "No end"}
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {c.usages.length}
                    {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${!c.isActive || expired ? "bg-ink/5 text-ink/50" : "bg-teal-50 text-teal-700"}`}>
                      {expired ? "Expired" : c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs">
                      <CouponModal coupon={c} courses={courses} trigger={<button className="font-medium text-teal-700 hover:underline">Edit</button>} />
                      <form action={deleteCouponAction.bind(null, c.id)}>
                        <button type="submit" className="font-medium text-red-500 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
