import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type RangeKey = "7d" | "30d" | "12m" | "custom";

export type DateRange = { key: RangeKey; from: Date; to: Date; unit: "day" | "month"; label: string };

const TZ = "Africa/Nairobi";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Resolve ?range=7d|30d|12m|custom&from=&to= into concrete bounds (spec §6 dashboard date-range picker). */
export function resolveRange(key?: string, from?: string, to?: string): DateRange {
  const now = new Date();
  if (key === "custom" && from && to) {
    const f = new Date(from);
    const t = new Date(to);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && f <= t) {
      const end = new Date(startOfDay(t).getTime() + 86_400_000 - 1);
      const days = (end.getTime() - startOfDay(f).getTime()) / 86_400_000;
      return { key: "custom", from: startOfDay(f), to: end, unit: days > 92 ? "month" : "day", label: `${from} → ${to}` };
    }
  }
  if (key === "7d") return { key: "7d", from: startOfDay(new Date(now.getTime() - 6 * 86_400_000)), to: now, unit: "day", label: "Last 7 days" };
  if (key === "12m") {
    const f = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return { key: "12m", from: f, to: now, unit: "month", label: "Last 12 months" };
  }
  return { key: "30d", from: startOfDay(new Date(now.getTime() - 29 * 86_400_000)), to: now, unit: "day", label: "Last 30 days" };
}

/** Every bucket label between from and to, so empty days/months still show as zero. */
function buckets(range: DateRange): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const cursor = range.unit === "month" ? new Date(range.from.getFullYear(), range.from.getMonth(), 1) : startOfDay(range.from);
  while (cursor <= range.to) {
    const key = range.unit === "month" ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}` : `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    out.push({
      key,
      label: cursor.toLocaleDateString("en-KE", range.unit === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }),
    });
    if (range.unit === "month") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

async function series(table: "Payment" | "Enrollment", range: DateRange): Promise<Map<string, number>> {
  const unit = Prisma.raw(`'${range.unit}'`);
  const fmt = Prisma.raw(range.unit === "month" ? `'YYYY-MM'` : `'YYYY-MM-DD'`);
  const rows =
    table === "Payment"
      ? await db.$queryRaw<{ b: string; v: bigint }[]>(Prisma.sql`
          SELECT to_char(date_trunc(${unit}, "createdAt" AT TIME ZONE ${TZ}), ${fmt}) AS b, COALESCE(SUM("amountKes"), 0) AS v
          FROM "Payment" WHERE "status" = 'SUCCESS' AND "createdAt" BETWEEN ${range.from} AND ${range.to} GROUP BY 1`)
      : await db.$queryRaw<{ b: string; v: bigint }[]>(Prisma.sql`
          SELECT to_char(date_trunc(${unit}, "enrolledAt" AT TIME ZONE ${TZ}), ${fmt}) AS b, COUNT(*) AS v
          FROM "Enrollment" WHERE "enrolledAt" BETWEEN ${range.from} AND ${range.to} GROUP BY 1`);
  return new Map(rows.map((r) => [r.b, Number(r.v)]));
}

export async function getAdminDashboardStats(range: DateRange) {
  const inRange = { gte: range.from, lte: range.to };

  const [revenueAll, revenueRange, enrollAll, enrollRange, totalStudents, newStudents, published, drafts, recentEnrollments, recentSignups, revSeries, enrSeries, payGroups, enrGroups] =
    await Promise.all([
      db.payment.aggregate({ _sum: { amountKes: true }, where: { status: "SUCCESS" } }),
      db.payment.aggregate({ _sum: { amountKes: true }, where: { status: "SUCCESS", createdAt: inRange } }),
      db.enrollment.count({ where: { status: "ACTIVE" } }),
      db.enrollment.count({ where: { enrolledAt: inRange } }),
      db.user.count({ where: { role: "LEARNER", deletedAt: null } }),
      db.user.count({ where: { role: "LEARNER", deletedAt: null, createdAt: inRange } }),
      db.course.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      db.course.count({ where: { status: "DRAFT", deletedAt: null } }),
      db.enrollment.findMany({ take: 10, orderBy: { enrolledAt: "desc" }, include: { user: { select: { name: true } }, course: { select: { title: true } } } }),
      db.user.findMany({ take: 10, orderBy: { createdAt: "desc" }, where: { role: "LEARNER", deletedAt: null }, select: { id: true, name: true, createdAt: true } }),
      series("Payment", range),
      series("Enrollment", range),
      db.payment.groupBy({ by: ["courseId"], where: { status: "SUCCESS", createdAt: inRange }, _sum: { amountKes: true } }),
      db.enrollment.groupBy({ by: ["courseId"], where: { enrolledAt: inRange }, _count: { _all: true } }),
    ]);

  const b = buckets(range);
  const courseIds = [...new Set([...payGroups.map((g) => g.courseId), ...enrGroups.map((g) => g.courseId)])];
  const titles = new Map((await db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })).map((c) => [c.id, c.title]));
  const top = <T,>(rows: T[], id: (r: T) => string, val: (r: T) => number) =>
    rows.map((r) => ({ id: id(r), title: titles.get(id(r)) ?? "(deleted course)", value: val(r) })).sort((x, y) => y.value - x.value).slice(0, 5);

  return {
    range,
    revenueAllTime: revenueAll._sum.amountKes ?? 0,
    revenueInRange: revenueRange._sum.amountKes ?? 0,
    enrollmentsAllTime: enrollAll,
    enrollmentsInRange: enrollRange,
    totalStudents,
    newStudents,
    totalCoursesPublished: published,
    totalCoursesDraft: drafts,
    recentEnrollments,
    recentSignups,
    revenueSeries: b.map((x) => ({ label: x.label, revenue: revSeries.get(x.key) ?? 0 })),
    enrollmentSeries: b.map((x) => ({ label: x.label, count: enrSeries.get(x.key) ?? 0 })),
    topByRevenue: top(payGroups, (g) => g.courseId, (g) => g._sum.amountKes ?? 0),
    topByEnrollments: top(enrGroups, (g) => g.courseId, (g) => g._count._all),
  };
}
