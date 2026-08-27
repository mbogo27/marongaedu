import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";

export async function GET(_req: Request, ctx: RouteContext<"/invoices/[paymentId]">) {
  const { paymentId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { course: true, user: true } });
  if (!payment || (payment.userId !== user.id && user.role !== "ADMIN")) {
    return new Response(null, { status: 404 });
  }

  const bytes = await generateInvoicePdf({
    invoiceId: payment.id,
    date: payment.createdAt,
    customerName: payment.user.name,
    customerEmail: payment.user.email,
    courseTitle: payment.course.title,
    amountKes: payment.amountKes,
    method: payment.method,
    reference: payment.reference,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${payment.id}.pdf"`,
    },
  });
}
