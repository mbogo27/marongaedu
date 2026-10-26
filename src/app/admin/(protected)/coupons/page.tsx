import { db } from "@/lib/db";
import { formatDate, formatKes } from "@/lib/format";
import CouponModal from "@/components/admin/CouponModal";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { deleteCouponAction } from "@/lib/actions/admin/coupons";
import { Badge, PageHeader, dangerBtn, tableWrap, td, th } from "@/components/admin/ui";

const BTN = "rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800";

export default async function AdminCouponsPage() {
  const [coupons, courses] = await Promise.all([
    db.coupon.findMany({ include: { courses: true, _count: { select: { usages: true } } }, orderBy: { createdAt: "desc" } }),
    db.course.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const now = new Date();

  return (
    <div>
      <PageHeader title="Coupons" actions={<CouponModal courses={courses} trigger="+ New coupon" triggerClassName={BTN} />} />

      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full min-w-[860px] text-sm">
          <caption className="sr-only">Coupons</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>Code</th>
              <th scope="col" className={th}>Discount</th>
              <th scope="col" className={th}>Scope</th>
              <th scope="col" className={th}>Validity</th>
              <th scope="col" className={th}>Uses</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {coupons.map((c) => {
              const expired = !!c.endsAt && c.endsAt < now;
              const exhausted = c.usageLimit != null && c._count.usages >= c.usageLimit;
              return (
                <tr key={c.id}>
                  <td className={`${td} font-mono font-medium text-ink`}>{c.code}</td>
                  <td className={`${td} text-ink/80`}>{c.discountType === "PERCENT" ? `${c.discountValue}%` : formatKes(c.discountValue)}</td>
                  <td className={`${td} text-ink/80`}>{c.courses.length === 0 ? "All courses" : `${c.courses.length} course(s)`}</td>
                  <td className={`${td} text-ink/70`}>{c.startsAt ? formatDate(c.startsAt) : "Any"} – {c.endsAt ? formatDate(c.endsAt) : "No end"}</td>
                  <td className={`${td} text-ink/80`}>
                    {c._count.usages}
                    {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    {c.perUserLimit != null && <span className="block text-xs text-ink/70">max {c.perUserLimit} per user</span>}
                  </td>
                  <td className={td}>
                    <Badge tone={!c.isActive || expired || exhausted ? "muted" : "good"}>{expired ? "Expired" : exhausted ? "Used up" : c.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className={td}>
                    <div className="flex gap-3">
                      <CouponModal coupon={c} courses={courses} trigger="Edit" />
                      <ConfirmAction className={dangerBtn} confirm={`Delete coupon ${c.code}?`} action={deleteCouponAction.bind(null, c.id)}>Delete</ConfirmAction>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {coupons.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/70">No coupons yet.</p>}
      </div>
    </div>
  );
}
