import { getAdminOrNull } from "@/lib/dal";
import { db } from "@/lib/db";
import { streamCsv } from "@/lib/csv";
import { paymentWhere } from "@/lib/admin/filters";
import { audit } from "@/lib/audit";

const BATCH = 500;

export async function GET(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return new Response(null, { status: 404 });

  const q = Object.fromEntries(new URL(req.url).searchParams);
  const where = paymentWhere(q);

  async function* batches() {
    let cursor: string | undefined;
    for (;;) {
      const rows = await db.payment.findMany({
        where,
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
      });
      if (rows.length === 0) return;
      cursor = rows[rows.length - 1].id;
      yield rows.map((p) => [
        p.createdAt,
        p.invoiceNumber ?? "",
        p.user.name,
        p.user.email,
        p.course.title,
        p.subtotalKes,
        p.discountKes,
        p.amountKes,
        p.method,
        p.status,
        p.reference ?? "",
        p.couponCode ?? "",
        p.failureReason ?? "",
      ]);
      if (rows.length < BATCH) return;
    }
  }

  await audit({ actorId: admin.id, action: "export.payments", meta: q });
  return streamCsv(
    ["Date", "Invoice", "Student", "Email", "Course", "Subtotal KES", "Discount KES", "Total KES", "Method", "Status", "Reference", "Coupon", "Failure reason"],
    batches(),
    `payments-${new Date().toISOString().slice(0, 10)}.csv`
  );
}
