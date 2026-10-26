import { getAdminOrNull } from "@/lib/dal";
import { db } from "@/lib/db";
import { streamCsv } from "@/lib/csv";
import { enrollmentWhere } from "@/lib/admin/filters";
import { audit } from "@/lib/audit";

const BATCH = 500;

// Route Handlers under (protected) are NOT covered by the layout guard, so check here.
export async function GET(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return new Response(null, { status: 404 });

  const q = Object.fromEntries(new URL(req.url).searchParams);
  const where = enrollmentWhere(q);

  async function* batches() {
    let cursor: string | undefined;
    for (;;) {
      const rows = await db.enrollment.findMany({
        where,
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
          payments: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
      if (rows.length === 0) return;
      cursor = rows[rows.length - 1].id;
      yield rows.map((e) => [
        e.user.name,
        e.user.email,
        e.course.title,
        e.enrolledAt,
        e.progressPercent,
        e.completedAt ?? "",
        e.payments[0]?.method ?? e.source,
        e.payments[0]?.amountKes ?? 0,
        e.status,
      ]);
      if (rows.length < BATCH) return;
    }
  }

  await audit({ actorId: admin.id, action: "export.enrollments", meta: q });
  return streamCsv(
    ["Student", "Email", "Course", "Enrolled At", "Progress %", "Completed At", "Method", "Amount KES", "Status"],
    batches(),
    `enrollments-${new Date().toISOString().slice(0, 10)}.csv`
  );
}
