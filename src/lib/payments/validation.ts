/** Card / phone validation shared by the checkout form (client) and the server action (spec §7.2.4). */

export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** "MM/YY", not in the past (valid through the last day of the month). */
export function isValidExpiry(mmYY: string, now = new Date()): boolean {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(mmYY.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 0, 23, 59, 59).getTime() >= now.getTime();
}

export function isValidCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

export function normalizeMpesaPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidMpesaPhone(phone: string): boolean {
  return /^254(7|1)\d{8}$/.test(normalizeMpesaPhone(phone));
}

export function cardBrand(cardNumber: string): string {
  const d = cardNumber.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  return "card";
}
