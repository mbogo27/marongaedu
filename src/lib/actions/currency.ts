"use server";

import { cookies } from "next/headers";
import { CURRENCY_COOKIE } from "@/lib/currency-constants";

/** Remember the display-currency choice (KES / USD). Display-only: charges are always KES. */
export async function setDisplayCurrencyAction(currency: "KES" | "USD") {
  const store = await cookies();
  store.set(CURRENCY_COOKIE, currency === "USD" ? "USD" : "KES", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
}
