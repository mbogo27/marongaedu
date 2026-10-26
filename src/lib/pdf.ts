import "server-only";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import type { CertificateTemplateSettings } from "@/lib/settings";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16) || 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Standard PDF fonts only encode WinAnsi; replace anything else so a name never crashes generation. */
function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

async function embedImage(doc: PDFDocument, bytes: Buffer | undefined, contentType?: string): Promise<PDFImage | undefined> {
  if (!bytes) return undefined;
  try {
    return contentType?.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return undefined; // unsupported format (e.g. webp): fall back to the default design
  }
}

export type CertificatePdfInput = {
  snapshot: { learnerName: string; courseTitle: string; completedAt: string; instructorName: string };
  code: string;
  issuedAt: Date;
  verifyUrl: string;
  template: CertificateTemplateSettings;
  background?: { bytes: Buffer; contentType?: string };
  signature?: { bytes: Buffer; contentType?: string };
};

/**
 * A4-landscape certificate. Text positions come from the admin-editable
 * `certificateTemplate.layout` (fractions of the page, origin top-left), so a
 * custom background can be matched without code changes (spec §9).
 */
export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const { template: tpl, snapshot } = input;
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const { width: W, height: H } = page.getSize();

  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const primary = hexToRgb(tpl.primaryColor);
  const accent = hexToRgb(tpl.accentColor);
  const ink = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.35, 0.35, 0.35);

  const bg = await embedImage(doc, input.background?.bytes, input.background?.contentType);
  if (bg) {
    page.drawImage(bg, { x: 0, y: 0, width: W, height: H });
  } else {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.98, 0.97, 0.95) });
    page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: primary, borderWidth: 3 });
    page.drawRectangle({ x: 34, y: 34, width: W - 68, height: H - 68, borderColor: accent, borderWidth: 1 });
    const heading = "CERTIFICATE OF COMPLETION";
    page.drawText(heading, { x: W / 2 - serifBold.widthOfTextAtSize(heading, 26) / 2, y: H - 110, size: 26, font: serifBold, color: primary });
    const lead = "This certifies that";
    page.drawText(lead, { x: W / 2 - sans.widthOfTextAtSize(lead, 12) / 2, y: H * (1 - 0.36), size: 12, font: sans, color: muted });
    const mid = "has successfully completed";
    page.drawText(mid, { x: W / 2 - sans.widthOfTextAtSize(mid, 12) / 2, y: H * (1 - 0.54), size: 12, font: sans, color: muted });
  }

  const L = tpl.layout;
  const centered = (text: string, font: PDFFont, size: number, xFrac: number, yFrac: number, color = ink) => {
    const s = safe(font, text);
    page.drawText(s, { x: W * xFrac - font.widthOfTextAtSize(s, size) / 2, y: H * (1 - yFrac), size, font, color });
  };

  centered(snapshot.learnerName, serifBold, L.name.size, L.name.x, L.name.y);
  centered(snapshot.courseTitle, serifItalic, L.course.size, L.course.x, L.course.y, primary);
  const date = new Date(snapshot.completedAt).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
  centered(`Completed ${date}`, sans, L.date.size, L.date.x, L.date.y, muted);
  centered(`Certificate ID: ${input.code}`, sans, L.id.size, L.id.x, L.id.y, muted);

  // Signature: uploaded image if present, otherwise the typed name over a rule.
  const sig = await embedImage(doc, input.signature?.bytes, input.signature?.contentType);
  const sigCenterX = W * L.signature.x;
  const sigY = H * (1 - L.signature.y);
  if (sig) {
    const w = W * L.signature.width;
    const h = (sig.height / sig.width) * w;
    page.drawImage(sig, { x: sigCenterX - w / 2, y: sigY, width: w, height: h });
  } else {
    centered(tpl.signatureName, serifItalic, 16, L.signature.x, L.signature.y - 0.005);
  }
  page.drawLine({ start: { x: sigCenterX - 90, y: sigY - 6 }, end: { x: sigCenterX + 90, y: sigY - 6 }, thickness: 0.8, color: muted });
  centered(`${tpl.signatureName}, ${tpl.signatureTitle}`, sans, 9, L.signature.x, L.signature.y + 0.04, muted);

  // QR → public verification page.
  const qrPng = await QRCode.toBuffer(input.verifyUrl, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  const qr = await doc.embedPng(qrPng);
  const qrSize = W * L.qr.size;
  page.drawImage(qr, { x: W * L.qr.x, y: H * (1 - L.qr.y) - qrSize, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", { x: W * L.qr.x, y: H * (1 - L.qr.y) - qrSize - 11, size: 8, font: sans, color: muted });
  const verifyLabel = safe(sans, input.verifyUrl);
  page.drawText(verifyLabel, { x: W - 48 - sans.widthOfTextAtSize(verifyLabel, 8), y: 44, size: 8, font: sans, color: muted });

  return doc.save();
}

export type InvoicePdfInput = {
  invoiceNumber: string;
  date: Date;
  seller: { name: string; address: string; taxId: string };
  buyer: { name: string; email: string };
  courseTitle: string;
  subtotalKes: number;
  discountKes: number;
  totalKes: number;
  couponCode: string | null;
  method: string;
  reference: string | null;
  refunded: boolean;
  simulated: boolean;
};

export async function generateInvoicePdf(i: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width: W, height: H } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const grey = rgb(0.4, 0.4, 0.4);
  const money = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
  const right = (text: string, y: number, size = 11, font = reg) => {
    const s = safe(font, text);
    page.drawText(s, { x: W - 48 - font.widthOfTextAtSize(s, size), y, size, font });
  };
  const left = (text: string, y: number, size = 11, font = reg, color = rgb(0, 0, 0)) =>
    page.drawText(safe(font, text), { x: 48, y, size, font, color });

  let y = H - 60;
  left(i.seller.name, y, 20, bold, rgb(0.06, 0.3, 0.3));
  y -= 16;
  left(i.seller.address, y, 10, reg, grey);
  if (i.seller.taxId) {
    y -= 13;
    left(`Tax ID: ${i.seller.taxId}`, y, 10, reg, grey);
  }
  right("INVOICE", H - 60, 20, bold);
  right(i.invoiceNumber, H - 80, 11);
  if (i.simulated) right("Demo: no real payment was processed", H - 95, 9);

  y -= 50;
  left("Billed to", y, 9, bold, grey);
  y -= 15;
  left(i.buyer.name, y);
  y -= 14;
  left(i.buyer.email, y, 10, reg, grey);
  right(`Date: ${i.date.toLocaleDateString("en-KE")}`, y + 14, 11);

  y -= 40;
  page.drawLine({ start: { x: 48, y }, end: { x: W - 48, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  left("Description", y, 10, bold);
  right("Amount", y, 10, bold);
  y -= 22;
  left(i.courseTitle, y);
  right(money(i.subtotalKes), y);
  if (i.discountKes > 0) {
    y -= 18;
    left(`Discount${i.couponCode ? ` (${i.couponCode})` : ""}`, y, 10, reg, grey);
    right(`- ${money(i.discountKes)}`, y, 10);
  }
  y -= 20;
  page.drawLine({ start: { x: 48, y }, end: { x: W - 48, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 22;
  left("Total", y, 13, bold);
  right(money(i.totalKes), y, 13, bold);
  if (i.refunded) {
    y -= 20;
    left("REFUNDED", y, 12, bold, rgb(0.7, 0.1, 0.1));
  }

  y -= 40;
  left(`Payment method: ${i.method}`, y, 10, reg, grey);
  y -= 14;
  left(`Reference: ${i.reference ?? "-"}`, y, 10, reg, grey);

  return doc.save();
}
