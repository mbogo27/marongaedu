import { db } from "@/lib/db";
import { formatKes, formatDate } from "@/lib/format";
import { refundPaymentAction } from "@/lib/actions/admin/payments";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; method?: string }>;
}) {
  const { status, method } = await searchParams;

  const payments = await db.payment.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(method ? { method: method as never } : {}),
    },
    include: { user: true, course: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-2xl text-teal-900">Payments</h1>
      <form className="mt-4 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-teal-100 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select name="method" defaultValue={method ?? ""} className="rounded-lg border border-teal-100 px-3 py-2 text-sm">
          <option value="">All methods</option>
          <option value="MPESA">M-Pesa</option>
          <option value="CARD">Card</option>
          <option value="FREE">Free</option>
          <option value="MANUAL">Manual</option>
        </select>
        <button type="submit" className="rounded-lg bg-teal-100 px-4 py-2 text-sm font-medium text-teal-700">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-teal-100 text-left text-ink/50">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-ink/40">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3 text-ink">{p.user.name}</td>
                <td className="px-4 py-3 text-ink/70">{p.course.title}</td>
                <td className="px-4 py-3 text-ink/60">{formatKes(p.amountKes)}</td>
                <td className="px-4 py-3 text-ink/60">{p.method}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "SUCCESS" ? "bg-teal-50 text-teal-700" : p.status === "FAILED" ? "bg-red-50 text-red-600" : p.status === "REFUNDED" ? "bg-ink/5 text-ink/50" : "bg-gold-50 text-gold-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink/40">{p.reference ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.status === "SUCCESS" && (
                    <form action={refundPaymentAction.bind(null, p.id)}>
                      <button type="submit" className="text-xs font-medium text-red-500 hover:underline">
                        Refund
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink/50">No payments found.</p>}
      </div>
    </div>
  );
}
