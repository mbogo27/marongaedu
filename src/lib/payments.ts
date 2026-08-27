import "server-only";
import { nanoid } from "nanoid";

export type MpesaOutcome =
  | { kind: "success"; receipt: string }
  | { kind: "failed"; message: string }
  | { kind: "pending" };

export type CardOutcome =
  | { kind: "success"; chargeId: string }
  | { kind: "failed"; message: string };

/** spec-2.md §6.1 — M-Pesa STK push simulation rules. */
export function simulateMpesa(phone: string): MpesaOutcome {
  const digits = phone.replace(/\D/g, "");
  if (digits.endsWith("0000")) {
    return { kind: "failed", message: "Payment not confirmed. Try again." };
  }
  if (digits.endsWith("1111")) {
    return { kind: "pending" };
  }
  return { kind: "success", receipt: `MDEMO${nanoid(8).toUpperCase()}` };
}

/** spec-2.md §6.2 — card charge simulation rules. */
export function simulateCard(cardNumber: string): CardOutcome {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.endsWith("0000")) {
    return { kind: "failed", message: "Your card was declined." };
  }
  if (digits.endsWith("0002")) {
    return { kind: "failed", message: "Insufficient funds." };
  }
  return { kind: "success", chargeId: `ch_demo_${nanoid(12)}` };
}

/** Luhn check for client- and server-side card number validation. */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 12) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(mmYY: string): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(mmYY.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const expiry = new Date(year, month, 0, 23, 59, 59);
  return expiry.getTime() >= Date.now();
}

export function isValidMpesaPhone(phone: string): boolean {
  return /^254(7|1)\d{8}$/.test(phone.replace(/\D/g, ""));
}
