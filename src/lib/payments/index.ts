import "server-only";
import { env } from "@/lib/env";
import { SimulatedCardProvider, SimulatedMpesaProvider } from "@/lib/payments/simulated";
import type { PaymentProvider } from "@/lib/payments/types";

export * from "@/lib/payments/types";

const providers = {
  simulated: { mpesa: new SimulatedMpesaProvider(), card: new SimulatedCardProvider() },
} as const;

/** Provider selection by PAYMENTS_MODE. Add `daraja` / `paystack` entries here when going live. */
export function getPaymentProvider(method: "mpesa" | "card"): PaymentProvider {
  return providers[env.PAYMENTS_MODE][method];
}

export const isSimulatedPayments = () => env.PAYMENTS_MODE === "simulated";
