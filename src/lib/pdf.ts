import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return rgb(((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255);
}

export async function generateCertificatePdf(opts: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  certificateId: string;
  signatureName: string;
  signatureTitle: string;
  primaryColor: string;
  accentColor: string;
  verifyUrl: string;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  const primary = hexToRgb(opts.primaryColor);
  const accent = hexToRgb(opts.accentColor);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.97, 0.95) });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: primary, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: accent, borderWidth: 1 });

  page.drawText("CERTIFICATE OF COMPLETION", {
    x: width / 2 - 190,
    y: height - 110,
    size: 24,
    font: serif,
    color: primary,
  });

  page.drawText("This certifies that", {
    x: width / 2 - 60,
    y: height - 170,
    size: 12,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  const nameWidth = serif.widthOfTextAtSize(opts.learnerName, 32);
  page.drawText(opts.learnerName, {
    x: width / 2 - nameWidth / 2,
    y: height - 220,
    size: 32,
    font: serif,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("has successfully completed", {
    x: width / 2 - 90,
    y: height - 260,
    size: 12,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  const titleWidth = serifItalic.widthOfTextAtSize(opts.courseTitle, 20);
  page.drawText(opts.courseTitle, {
    x: width / 2 - titleWidth / 2,
    y: height - 300,
    size: 20,
    font: serifItalic,
    color: primary,
  });

  page.drawText(`Issued ${opts.issuedAt.toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}`, {
    x: width / 2 - 90,
    y: height - 340,
    size: 11,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Signature block
  page.drawLine({ start: { x: width / 2 - 120, y: 130 }, end: { x: width / 2 + 120, y: 130 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  const sigWidth = serifItalic.widthOfTextAtSize(opts.signatureName, 16);
  page.drawText(opts.signatureName, { x: width / 2 - sigWidth / 2, y: 138, size: 16, font: serifItalic, color: rgb(0.1, 0.1, 0.1) });
  const sigTitleWidth = sans.widthOfTextAtSize(opts.signatureTitle, 10);
  page.drawText(opts.signatureTitle, { x: width / 2 - sigTitleWidth / 2, y: 112, size: 10, font: sans, color: rgb(0.4, 0.4, 0.4) });

  page.drawText(`Certificate ID: ${opts.certificateId}`, { x: 48, y: 48, size: 9, font: sans, color: rgb(0.5, 0.5, 0.5) });
  const verifyLabel = `Verify at: ${opts.verifyUrl}`;
  const verifyWidth = sans.widthOfTextAtSize(verifyLabel, 9);
  page.drawText(verifyLabel, { x: width - 48 - verifyWidth, y: 48, size: 9, font: sans, color: rgb(0.5, 0.5, 0.5) });

  return doc.save();
}

export async function generateInvoicePdf(opts: {
  invoiceId: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  courseTitle: string;
  amountKes: number;
  method: string;
  reference: string | null;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  let y = height - 60;
  page.drawText("Maronga Dental Academy", { x: 48, y, size: 20, font: bold, color: rgb(0.06, 0.3, 0.3) });
  y -= 20;
  page.drawText("Invoice (demo — no real payment processed)", { x: 48, y, size: 10, font: regular, color: rgb(0.4, 0.4, 0.4) });

  y -= 50;
  page.drawText(`Invoice #: ${opts.invoiceId}`, { x: 48, y, size: 11, font: regular });
  y -= 16;
  page.drawText(`Date: ${opts.date.toLocaleDateString("en-KE")}`, { x: 48, y, size: 11, font: regular });
  y -= 16;
  page.drawText(`Billed to: ${opts.customerName} (${opts.customerEmail})`, { x: 48, y, size: 11, font: regular });

  y -= 50;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 24;
  page.drawText("Description", { x: 48, y, size: 11, font: bold });
  page.drawText("Amount (KES)", { x: width - 160, y, size: 11, font: bold });
  y -= 20;
  page.drawText(opts.courseTitle, { x: 48, y, size: 11, font: regular });
  page.drawText(opts.amountKes.toLocaleString("en-KE"), { x: width - 160, y, size: 11, font: regular });

  y -= 30;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 24;
  page.drawText("Total", { x: 48, y, size: 13, font: bold });
  page.drawText(`KES ${opts.amountKes.toLocaleString("en-KE")}`, { x: width - 160, y, size: 13, font: bold });

  y -= 40;
  page.drawText(`Payment method: ${opts.method}`, { x: 48, y, size: 10, font: regular, color: rgb(0.4, 0.4, 0.4) });
  y -= 16;
  page.drawText(`Reference: ${opts.reference ?? "-"}`, { x: 48, y, size: 10, font: regular, color: rgb(0.4, 0.4, 0.4) });

  return doc.save();
}
