import { db } from "@/lib/db";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return startOfMonth(d);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminDashboardStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    revenueAllTime,
    revenueThisMonth,
    enrollmentsAllTime,
    enrollmentsThisMonth,
    totalStudents,
    totalCoursesPublished,
    totalCoursesDraft,
    recentEnrollments,
    recentSignups,
  ] = await Promise.all([
    db.payment.aggregate({ _sum: { amountKes: true }, where: { status: "SUCCESS" } }),
    db.payment.aggregate({ _sum: { amountKes: true }, where: { status: "SUCCESS", createdAt: { gte: monthStart } } }),
    db.enrollment.count(),
    db.enrollment.count({ where: { enrolledAt: { gte: monthStart } } }),
    db.user.count({ where: { role: "LEARNER", deletedAt: null } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.course.count({ where: { status: "DRAFT" } }),
    db.enrollment.findMany({
      take: 10,
      orderBy: { enrolledAt: "desc" },
      include: { user: true, course: true },
    }),
    db.user.findMany({ take: 10, orderBy: { createdAt: "desc" }, where: { role: "LEARNER" } }),
  ]);

  // Revenue chart: last 12 months
  const revenuePayments = await db.payment.findMany({
    where: { status: "SUCCESS", createdAt: { gte: monthsAgo(11) } },
    select: { amountKes: true, createdAt: true },
  });
  const revenueByMonth: { label: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthStartI = monthsAgo(i);
    const monthEndI = i === 0 ? new Date() : monthsAgo(i - 1);
    const total = revenuePayments
      .filter((p) => p.createdAt >= monthStartI && p.createdAt < monthEndI)
      .reduce((s, p) => s + p.amountKes, 0);
    revenueByMonth.push({ label: monthStartI.toLocaleDateString("en-KE", { month: "short" }), revenue: total });
  }

  // Enrollments chart: last 30 days
  const enrollmentRows = await db.enrollment.findMany({
    where: { enrolledAt: { gte: daysAgo(29) } },
    select: { enrolledAt: true },
  });
  const enrollmentsByDay: { label: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = daysAgo(i);
    const dayEnd = daysAgo(i - 1);
    const count = enrollmentRows.filter((e) => e.enrolledAt >= dayStart && e.enrolledAt < dayEnd).length;
    enrollmentsByDay.push({ label: dayStart.toLocaleDateString("en-KE", { day: "numeric", month: "short" }), count });
  }

  // Top courses by revenue and enrollments
  const courses = await db.course.findMany({
    include: {
      payments: { where: { status: "SUCCESS" }, select: { amountKes: true } },
      _count: { select: { enrollments: true } },
    },
  });
  const topByRevenue = [...courses]
    .map((c) => ({ id: c.id, title: c.title, value: c.payments.reduce((s, p) => s + p.amountKes, 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topByEnrollments = [...courses]
    .map((c) => ({ id: c.id, title: c.title, value: c._count.enrollments }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    revenueAllTime: revenueAllTime._sum.amountKes ?? 0,
    revenueThisMonth: revenueThisMonth._sum.amountKes ?? 0,
    enrollmentsAllTime,
    enrollmentsThisMonth,
    totalStudents,
    totalCoursesPublished,
    totalCoursesDraft,
    recentEnrollments,
    recentSignups,
    revenueByMonth,
    enrollmentsByDay,
    topByRevenue,
    topByEnrollments,
  };
}
