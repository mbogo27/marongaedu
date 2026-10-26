import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getUsdRate } from "@/lib/settings";
import { formatKes, formatUsd } from "@/lib/format";

import { CURRENCY_COOKIE } from "@/lib/currency-constants";

export type DisplayCurrency = { currency: "KES" | "USD"; rate: number; format: (kes: number) => string };

/**
 * KES is the only charge currency; USD is a display toggle using the rate in
 * Settings (spec §7.4). The choice is remembered in a cookie.
 */
export const getDisplayCurrency = cache(async (): Promise<DisplayCurrency> => {
  const [store, rate] = await Promise.all([cookies(), getUsdRate()]);
  const currency = store.get(CURRENCY_COOKIE)?.value === "USD" ? "USD" : "KES";
  return { currency, rate, format: (kes) => (currency === "USD" ? formatUsd(kes, rate) : formatKes(kes)) };
});
