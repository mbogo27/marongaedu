import type { Prisma } from "@prisma/client";

const METHODS = ["MPESA", "CARD", "FREE", "MANUAL"] as const;
const PAY_STATUSES = ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"] as const;

function dayRange(from?: string, to?: string) {
  const range: { gte?: Date; lte?: Date } = {};
  if (from && !Number.isNaN(Date.parse(from))) range.gte = new Date(from);
  if (to && !Number.isNaN(Date.parse(to))) range.lte = new Date(new Date(to).getTime() + 86_399_999);
  return Object.keys(range).length ? range : undefined;
}

export type EnrollmentFilterParams = { course?: string; method?: string; status?: string; from?: string; to?: string };

export function enrollmentWhere(p: EnrollmentFilterParams): Prisma.EnrollmentWhereInput {
  const dates = dayRange(p.from, p.to);
  return {
    ...(p.course ? { courseId: p.course } : {}),
    ...(dates ? { enrolledAt: dates } : {}),
    ...(p.status === "ACTIVE" || p.status === "REVOKED" ? { status: p.status } : {}),
    ...((METHODS as readonly string[]).includes(p.method ?? "") ? { payments: { some: { method: p.method as (typeof METHODS)[number], status: "SUCCESS" } } } : {}),
  };
}

export type PaymentFilterParams = { status?: string; method?: string; from?: string; to?: string; q?: string };

export function paymentWhere(p: PaymentFilterParams): Prisma.PaymentWhereInput {
  const dates = dayRange(p.from, p.to);
  return {
    ...((PAY_STATUSES as readonly string[]).includes(p.status ?? "") ? { status: p.status as (typeof PAY_STATUSES)[number] } : {}),
    ...((METHODS as readonly string[]).includes(p.method ?? "") ? { method: p.method as (typeof METHODS)[number] } : {}),
    ...(dates ? { createdAt: dates } : {}),
    ...(p.q
      ? {
          OR: [
            { reference: { contains: p.q, mode: "insensitive" } },
            { invoiceNumber: { contains: p.q, mode: "insensitive" } },
            { user: { name: { contains: p.q, mode: "insensitive" } } },
            { user: { email: { contains: p.q, mode: "insensitive" } } },
            { course: { title: { contains: p.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}
