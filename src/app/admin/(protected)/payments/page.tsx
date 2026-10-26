import { db } from "@/lib/db";
import { formatKes, formatDate } from "@/lib/format";
import { paymentWhere } from "@/lib/admin/filters";
import { refundPaymentAction } from "@/lib/actions/admin/payments";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { Badge, PageHeader, Pager, dangerBtn, filterButton, filterInput, statusTone, tableWrap, td, th } from "@/components/admin/ui";

const PER_PAGE = 25;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; method?: string; from?: string; to?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = paymentWhere(sp);

  const [total, payments, sums] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      include: { user: { select: { name: true } }, course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.payment.aggregate({ where: { ...where, status: "SUCCESS" }, _sum: { amountKes: true } }),
  ]);
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();

  return (
    <div>
      <PageHeader
        title="Payments"
        actions={
          <a href={`/admin/payments/export${exportQs ? `?${exportQs}` : ""}`} className="rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">
            Export CSV
          </a>
        }
      />
      <p className="mt-1 text-sm text-ink/70">{total} transactions · {formatKes(sums._sum.amountKes ?? 0)} successful in this view</p>

      <form className="mt-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter payments">
        <label className="text-xs text-ink/80">
          Search
          <input name="q" defaultValue={sp.q} placeholder="Student, course, reference…" className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          Status
          <select name="status" defaultValue={sp.status ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">All statuses</option>
            {["SUCCESS", "FAILED", "PENDING", "CANCELLED", "REFUNDED"].map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink/80">
          Method
          <select name="method" defaultValue={sp.method ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">All methods</option>
            <option value="MPESA">M-Pesa</option>
            <option value="CARD">Card</option>
            <option value="FREE">Free</option>
            <option value="MANUAL">Manual</option>
          </select>
        </label>
        <label className="text-xs text-ink/80">
          From
          <input type="date" name="from" defaultValue={sp.from} className={`${filterInput} mt-1 block`} />
        </label>
        <label className="text-xs text-ink/80">
          To
          <input type="date" name="to" defaultValue={sp.to} className={`${filterInput} mt-1 block`} />
        </label>
        <button type="submit" className={filterButton}>Filter</button>
      </form>

      <div className={`mt-6 ${tableWrap}`}>
        <table className="w-full min-w-[1000px] text-sm">
          <caption className="sr-only">Payments</caption>
          <thead className="border-b border-teal-100 text-left text-ink/70">
            <tr>
              <th scope="col" className={th}>Date</th>
              <th scope="col" className={th}>Student</th>
              <th scope="col" className={th}>Course</th>
              <th scope="col" className={th}>Amount</th>
              <th scope="col" className={th}>Method</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Reference</th>
              <th scope="col" className={th}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className={`${td} text-ink/70`}>{formatDate(p.createdAt)}</td>
                <td className={`${td} text-ink`}>{p.user.name}</td>
                <td className={`${td} text-ink/80`}>{p.course.title}</td>
                <td className={`${td} text-ink/80`}>
                  {formatKes(p.amountKes)}
                  {p.discountKes > 0 && <span className="block text-xs text-ink/70">−{formatKes(p.discountKes)} {p.couponCode}</span>}
                </td>
                <td className={`${td} text-ink/80`}>{p.method}</td>
                <td className={td}>
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  {p.failureReason && <span className="mt-1 block max-w-[10rem] text-xs text-ink/70">{p.failureReason}</span>}
                </td>
                <td className={`${td} text-xs text-ink/70`}>
                  {p.reference ?? "—"}
                  {p.invoiceNumber && <span className="block">{p.invoiceNumber}</span>}
                </td>
                <td className={td}>
                  {p.status === "SUCCESS" && p.amountKes > 0 && (
                    <ConfirmAction className={dangerBtn} confirm={`Refund ${formatKes(p.amountKes)} to ${p.user.name}? Their access to "${p.course.title}" is revoked.`} action={refundPaymentAction.bind(null, p.id)}>
                      Refund
                    </ConfirmAction>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/70">No payments found.</p>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/admin/payments" params={sp} />
    </div>
  );
}
