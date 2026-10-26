import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";
import { getSetting } from "@/lib/settings";
import { isSimulatedPayments } from "@/lib/payments";

/** Invoice PDF for a settled payment; owner or admin only (spec §7.3). */
export async function GET(_req: Request, ctx: RouteContext<"/invoices/[paymentId]">) {
  const { paymentId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { course: true, user: true } });
  if (!payment || (payment.userId !== user.id && user.role !== "ADMIN")) return new Response("Not found", { status: 404 });
  if (!payment.invoiceNumber || (payment.status !== "SUCCESS" && payment.status !== "REFUNDED")) {
    return new Response("No invoice for this payment.", { status: 404 });
  }

  const invoice = await getSetting("invoice");
  const bytes = await generateInvoicePdf({
    invoiceNumber: payment.invoiceNumber,
    date: payment.createdAt,
    seller: { name: invoice.sellerName, address: invoice.sellerAddress, taxId: invoice.sellerTaxId },
    buyer: { name: payment.user.name, email: payment.user.email },
    courseTitle: payment.course.title,
    subtotalKes: payment.subtotalKes || payment.amountKes,
    discountKes: payment.discountKes,
    totalKes: payment.amountKes,
    couponCode: payment.couponCode,
    method: payment.method === "MPESA" ? "M-Pesa" : payment.method === "CARD" ? `Card${payment.cardLast4 ? ` ending ${payment.cardLast4}` : ""}` : payment.method,
    reference: payment.reference,
    refunded: payment.status === "REFUNDED",
    simulated: isSimulatedPayments(),
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${payment.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
