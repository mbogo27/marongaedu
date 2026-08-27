import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  await requireAdmin();

  const enrollments = await db.enrollment.findMany({
    include: { user: true, course: true, payment: true },
    orderBy: { enrolledAt: "desc" },
  });

  const header = ["Student", "Email", "Course", "Enrolled At", "Progress %", "Completed At", "Method", "Amount KES"];
  const rows = enrollments.map((e) => [
    e.user.name,
    e.user.email,
    e.course.title,
    e.enrolledAt.toISOString(),
    String(e.progressPercent),
    e.completedAt ? e.completedAt.toISOString() : "",
    e.payment?.method ?? e.source,
    String(e.payment?.amountKes ?? 0),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="enrollments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
