import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cardBrand, isValidCvv, isValidExpiry, isValidLuhn, isValidMpesaPhone, normalizeMpesaPhone } from "@/lib/payments/validation";
import type { InitiateInput, PaymentProvider, ProviderOutcome, RefundResult, StatusResult, WebhookResult } from "@/lib/payments/types";

/**
 * Simulated providers (PAYMENTS_MODE=simulated, behaviour per spec v1 §6).
 *
 * They are deliberately STATELESS so they work on serverless: the M-Pesa
 * "reference" encodes when the STK push started and which trigger the phone
 * number selected, and `getStatus` derives the outcome from the clock.
 */

// 3s "Sending STK push…" + 2s "Enter your PIN…" before the result lands (spec v1 §6.1).
export const MPESA_SIM_DELAY_MS = 5_000;

type Trigger = "ok" | "fail" | "hold";

function triggerFor(phone: string): Trigger {
  const digits = normalizeMpesaPhone(phone);
  if (digits.endsWith("0000")) return "fail";
  if (digits.endsWith("1111")) return "hold";
  return "ok";
}

function receiptFor(seed: string): string {
  return `MDEMO${createHash("sha256").update(seed).digest("hex").slice(0, 8).toUpperCase()}`;
}

export class SimulatedMpesaProvider implements PaymentProvider {
  readonly id = "mpesa" as const;

  async initiate(input: InitiateInput): Promise<ProviderOutcome> {
    if (!input.phone || !isValidMpesaPhone(input.phone)) {
      return { status: "failed", message: "Enter a valid M-Pesa number in the format 2547XXXXXXXX." };
    }
    // sim:<startMs>:<trigger>:<paymentId>
    return { status: "pending", reference: `sim:${Date.now()}:${triggerFor(input.phone)}:${input.paymentId}` };
  }

  async getStatus(reference: string): Promise<StatusResult> {
    const [, startMs, trigger, paymentId] = reference.split(":");
    const elapsed = Date.now() - Number(startMs);
    if (trigger === "hold") return { status: "pending" };
    if (elapsed < MPESA_SIM_DELAY_MS) return { status: "pending" };
    if (trigger === "fail") return { status: "failed", message: "Payment not confirmed. Try again." };
    return { status: "success", reference: receiptFor(`${paymentId}:${startMs}`) };
  }

  async handleWebhook(): Promise<WebhookResult> {
    return { handled: false }; // simulated provider has no callbacks
  }

  async refund(reference: string): Promise<RefundResult> {
    return { ok: true, reference: `RDEMO${receiptFor(reference).slice(5)}` };
  }
}

export class SimulatedCardProvider implements PaymentProvider {
  readonly id = "card" as const;

  async initiate(input: InitiateInput): Promise<ProviderOutcome> {
    const card = input.card;
    if (!card || !isValidLuhn(card.number)) return { status: "failed", message: "Enter a valid card number." };
    if (!isValidExpiry(card.expiry)) return { status: "failed", message: "Card expiry is invalid or in the past." };
    if (!isValidCvv(card.cvv)) return { status: "failed", message: "CVV must be 3 or 4 digits." };

    const digits = card.number.replace(/\D/g, "");
    if (digits.endsWith("0000")) return { status: "failed", message: "Your card was declined." };
    if (digits.endsWith("0002")) return { status: "failed", message: "Insufficient funds." };

    // Only brand + last4 ever leave this function; the PAN/CVV are not stored anywhere.
    return {
      status: "success",
      reference: `ch_demo_${randomBytes(9).toString("hex")}`,
      cardBrand: cardBrand(card.number),
      cardLast4: digits.slice(-4),
    };
  }

  async getStatus(): Promise<StatusResult> {
    return { status: "pending" }; // card results are synchronous; nothing to poll
  }

  async handleWebhook(): Promise<WebhookResult> {
    return { handled: false };
  }

  async refund(reference: string): Promise<RefundResult> {
    return { ok: true, reference: `re_demo_${createHash("sha256").update(reference).digest("hex").slice(0, 12)}` };
  }
}
