/**
 * Payment provider seam (spec §7.1). Real M-Pesa Daraja / Paystack / Stripe
 * adapters implement this interface; the checkout service, polling endpoint
 * and admin refund flow only ever talk to `PaymentProvider`.
 */

export type CardInput = { number: string; expiry: string; cvv: string; holder?: string };

export type InitiateInput = {
  paymentId: string;
  amountKes: number;
  phone?: string;
  card?: CardInput;
};

export type ProviderOutcome =
  | { status: "success"; reference: string; cardBrand?: string; cardLast4?: string }
  | { status: "failed"; message: string }
  | { status: "pending"; reference: string };

export type StatusResult =
  | { status: "success"; reference: string }
  | { status: "failed"; message: string }
  | { status: "pending" };

export type WebhookResult = { handled: boolean; paymentId?: string };
export type RefundResult = { ok: boolean; reference?: string; message?: string };

export interface PaymentProvider {
  readonly id: "mpesa" | "card";
  /** Start a charge. Card is typically synchronous; M-Pesa returns `pending` until the STK prompt resolves. */
  initiate(input: InitiateInput): Promise<ProviderOutcome>;
  /** Poll a pending charge by the provider reference returned from `initiate`. */
  getStatus(reference: string): Promise<StatusResult>;
  /** Provider callback endpoint (Daraja callback / Stripe webhook). Simulated providers no-op. */
  handleWebhook(req: Request): Promise<WebhookResult>;
  refund(reference: string, amountKes?: number): Promise<RefundResult>;
}

/**
 * Payment state machine (see docs/ARCHITECTURE.md). SUCCESS can only move to
 * REFUNDED; FAILED / CANCELLED / REFUNDED are terminal.
 */
export type PaymentState = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";

const TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  PENDING: ["SUCCESS", "FAILED", "CANCELLED"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return TRANSITIONS[from].includes(to);
}
