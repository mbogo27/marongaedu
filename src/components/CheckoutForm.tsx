"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKes, formatUsd } from "@/lib/format";
import { applyCouponAction, cancelPaymentAction, startCheckoutAction, type CouponQuote } from "@/lib/actions/checkout";
import { isValidCvv, isValidExpiry, isValidLuhn, isValidMpesaPhone } from "@/lib/payments/validation";
import { Field, FormMessage, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { track } from "@/lib/analytics";

type Method = "mpesa" | "card";
type Stage = "form" | "card-processing" | "mpesa-sending" | "mpesa-pin" | "mpesa-waiting" | "timeout" | "failed";

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
const STK_SENDING_MS = 3000;
const STK_PIN_MS = 5000; // 3s sending + 2s "enter your PIN"

export default function CheckoutForm({
  slug,
  title,
  thumbnailUrl,
  priceKes,
  usdRate,
  simulated,
}: {
  slug: string;
  title: string;
  thumbnailUrl: string;
  priceKes: number;
  usdRate: number;
  simulated: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("mpesa");
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponPending, setCouponPending] = useState(false);

  const [phone, setPhone] = useState("2547");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const paymentId = useRef<string | null>(null);
  // One key per attempt: a double-click or retry of the SAME attempt can never create a second charge.
  const idemKey = useRef<string>(crypto.randomUUID());
  const startedAt = useRef(0);
  const cancelled = useRef(false);

  const total = coupon?.valid ? coupon.totalKes : priceKes;
  const discount = coupon?.valid ? coupon.discountKes : 0;
  const fmt = (kes: number) => (currency === "KES" ? formatKes(kes) : formatUsd(kes, usdRate));
  const busy = stage !== "form" && stage !== "failed";

  useEffect(() => {
    track("checkout_started", { slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponPending(true);
    setCoupon(await applyCouponAction(slug, couponCode));
    setCouponPending(false);
  }

  function fail(message: string) {
    setError(message);
    setStage("failed");
    idemKey.current = crypto.randomUUID(); // a fresh attempt may be made
    paymentId.current = null;
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (method === "mpesa") {
      if (!isValidMpesaPhone(phone)) errs.phone = "Enter a number like 2547XXXXXXXX.";
    } else {
      if (!isValidLuhn(cardNumber)) errs.cardNumber = "Enter a valid card number.";
      if (!isValidExpiry(expiry)) errs.expiry = "Use MM/YY, not in the past.";
      if (!isValidCvv(cvv)) errs.cvv = "3 or 4 digits.";
      if (!cardName.trim()) errs.cardName = "Enter the name on the card.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function pay() {
    if (busy || !validate()) return;
    setError(null);
    cancelled.current = false;
    startedAt.current = Date.now();
    setStage(method === "mpesa" ? "mpesa-sending" : "card-processing");

    const minSpinner = method === "card" ? new Promise((r) => setTimeout(r, 2000)) : Promise.resolve();
    const [result] = await Promise.all([
      startCheckoutAction({
        slug,
        method,
        couponCode: coupon?.valid ? coupon.code : null,
        idempotencyKey: idemKey.current,
        phone: method === "mpesa" ? phone : undefined,
        card: method === "card" ? { number: cardNumber, expiry, cvv, holder: cardName } : undefined,
      }),
      minSpinner,
    ]);

    if (result.status === "success") return done(result.slug);
    if (result.status === "failed" || result.status === "error") return fail(result.message);

    // Pending: poll the server until it settles (M-Pesa STK push).
    paymentId.current = result.paymentId;
    await poll(result.paymentId);
  }

  function done(paidSlug: string) {
    track("payment_succeeded", { slug: paidSlug });
    router.push(`/learn/${paidSlug}?enrolled=success`);
  }

  async function poll(id: string) {
    while (!cancelled.current) {
      const elapsed = Date.now() - startedAt.current;
      setStage(elapsed < STK_SENDING_MS ? "mpesa-sending" : elapsed < STK_PIN_MS ? "mpesa-pin" : "mpesa-waiting");
      if (elapsed > POLL_TIMEOUT_MS) {
        setStage("timeout");
        return;
      }
      try {
        const res = await fetch(`/api/payments/${id}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status: string; slug?: string; message?: string };
          if (data.status === "SUCCESS" && data.slug) return done(data.slug);
          if (data.status === "FAILED" || data.status === "CANCELLED" || data.status === "REFUNDED") {
            return fail(data.message ?? "Payment was not completed.");
          }
        }
      } catch {
        /* transient network error: keep polling */
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }

  async function cancelPending() {
    cancelled.current = true;
    if (paymentId.current) await cancelPaymentAction(paymentId.current);
    setStage("form");
    setError(null);
    paymentId.current = null;
    idemKey.current = crypto.randomUUID();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-teal-100 bg-white p-6">
        {stage === "mpesa-sending" || stage === "mpesa-pin" || stage === "card-processing" ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" aria-hidden="true" />
            <p className="font-medium text-ink">
              {stage === "mpesa-sending" && `Sending STK push to ${phone}…`}
              {stage === "mpesa-pin" && "Enter your M-Pesa PIN on your phone…"}
              {stage === "card-processing" && "Processing payment…"}
            </p>
          </div>
        ) : stage === "mpesa-waiting" || stage === "timeout" ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="h-10 w-10 animate-pulse rounded-full bg-gold-300" aria-hidden="true" />
            <p className="font-medium text-ink">
              {stage === "timeout" ? "We haven't received a confirmation yet." : "Waiting for confirmation on your phone…"}
            </p>
            <p className="text-sm text-ink/70">
              {stage === "timeout"
                ? "You can cancel and try again, or keep waiting."
                : simulated
                  ? "In this demo, numbers ending 1111 stay pending until you cancel."
                  : "Approve the prompt on your phone to finish."}
            </p>
            <div className="flex gap-3">
              {stage === "timeout" && (
                <button
                  type="button"
                  onClick={() => {
                    startedAt.current = Date.now() - STK_PIN_MS;
                    cancelled.current = false;
                    if (paymentId.current) void poll(paymentId.current);
                  }}
                  className="rounded-full border border-teal-300 px-5 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
                >
                  Keep waiting
                </button>
              )}
              <button type="button" onClick={cancelPending} className="rounded-full border border-teal-300 px-5 py-2 text-sm font-medium text-ink/80 hover:bg-teal-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void pay();
            }}
          >
            <h2 className="font-serif text-xl text-teal-900">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              {(
                [
                  { id: "mpesa", label: "M-Pesa", sub: "Pay via STK push to your phone" },
                  { id: "card", label: "Card", sub: "Visa, Mastercard" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={method === m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-xl border-2 p-4 text-left transition ${method === m.id ? "border-teal-700 bg-teal-50" : "border-teal-100"}`}
                >
                  <p className="font-semibold text-ink">{m.label}</p>
                  <p className="text-sm text-ink/70">{m.sub}</p>
                </button>
              ))}
            </div>

            {method === "mpesa" ? (
              <div className="mt-6 space-y-4">
                <Field
                  label="M-Pesa phone number"
                  name="phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  error={fieldErrors.phone}
                  hint={simulated ? "Demo: numbers ending 0000 fail, ending 1111 stay pending, anything else succeeds." : undefined}
                />
                <button type="submit" disabled={busy} className={`w-full py-3 ${primaryButtonClass}`}>
                  Pay with M-Pesa · {fmt(total)}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <Field
                  label="Card number"
                  name="cardNumber"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/[^\d ]/g, "").slice(0, 23))}
                  placeholder="4242 4242 4242 4242"
                  error={fieldErrors.cardNumber}
                  hint={simulated ? "Demo: numbers ending 0000 are declined, ending 0002 fail for insufficient funds." : undefined}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Expiry (MM/YY)"
                    name="expiry"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value.slice(0, 5))}
                    placeholder="12/28"
                    error={fieldErrors.expiry}
                  />
                  <Field
                    label="CVV"
                    name="cvv"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    error={fieldErrors.cvv}
                  />
                </div>
                <Field
                  label="Cardholder name"
                  name="cardName"
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  error={fieldErrors.cardName}
                />
                <button type="submit" disabled={busy} className={`w-full py-3 ${primaryButtonClass}`}>
                  Pay {fmt(total)}
                </button>
              </div>
            )}

            {stage === "failed" && error && (
              <div className="mt-4">
                <FormMessage error={error} />
              </div>
            )}

            {simulated && (
              <p role="note" className="mt-6 rounded-lg bg-gold-50 px-4 py-2 text-xs text-gold-800">
                This is a demo — no real payment is processed.
              </p>
            )}
          </form>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-teal-100 bg-white p-6">
        <h2 className="font-serif text-lg text-teal-900">Order summary</h2>
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl} alt="" className="h-14 w-20 rounded-lg object-cover" />
          <p className="text-sm font-medium text-ink">{title}</p>
        </div>

        <div className="mt-4 flex gap-2">
          <label htmlFor="coupon" className="sr-only">
            Coupon code
          </label>
          <input
            id="coupon"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Coupon code"
            disabled={busy}
            className={`${inputClass} mt-0 min-w-0 flex-1 px-3 py-2`}
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={couponPending || busy}
            className="shrink-0 rounded-lg border border-teal-700 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
          >
            Apply
          </button>
        </div>
        <div aria-live="polite">
          {coupon && !coupon.valid && <p className="mt-2 text-xs text-red-700">{coupon.error}</p>}
          {coupon?.valid && <p className="mt-2 text-xs text-teal-800">Coupon {coupon.code} applied.</p>}
        </div>

        <dl className="mt-4 space-y-2 border-t border-teal-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink/70">Subtotal</dt>
            <dd>{fmt(priceKes)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-teal-800">
              <dt>Discount</dt>
              <dd>-{fmt(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-teal-100 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{fmt(total)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex rounded-full bg-teal-50 p-1 text-xs font-medium" role="group" aria-label="Display currency">
          {(["KES", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
              className={`flex-1 rounded-full py-1.5 transition ${currency === c ? "bg-white text-teal-800 shadow-sm" : "text-ink/70"}`}
            >
              {c}
            </button>
          ))}
        </div>
        {currency === "USD" && <p className="mt-2 text-xs text-ink/60">USD is for display only — you are charged in KES.</p>}
      </div>
    </div>
  );
}
