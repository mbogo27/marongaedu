"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKes, formatUsd } from "@/lib/format";
import { applyCouponAction, attemptMpesaPaymentAction, attemptCardPaymentAction, cancelPendingPaymentAction, type CouponResult } from "@/lib/actions/checkout";

type Method = "mpesa" | "card";
type Stage = "form" | "mpesa-sending" | "mpesa-pin" | "mpesa-pending" | "card-processing" | "success" | "failed";

export default function CheckoutForm({
  slug,
  courseId,
  title,
  thumbnailUrl,
  priceKes,
  usdRate,
}: {
  slug: string;
  courseId: string;
  title: string;
  thumbnailUrl: string;
  priceKes: number;
  usdRate: number;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("mpesa");
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponPending, setCouponPending] = useState(false);

  const [phone, setPhone] = useState("2547");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const [stage, setStage] = useState<Stage>("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  const total = coupon?.valid ? coupon.totalKes : priceKes;
  const discount = coupon?.valid ? coupon.discountKes : 0;
  const fmt = (kes: number) => (currency === "KES" ? formatKes(kes) : formatUsd(kes, usdRate));

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponPending(true);
    const result = await applyCouponAction(courseId, priceKes, couponCode);
    setCoupon(result);
    setCouponPending(false);
  }

  async function payWithMpesa() {
    setErrorMessage(null);
    setStage("mpesa-sending");
    await sleep(3000);
    setStage("mpesa-pin");
    await sleep(2000);
    const result = await attemptMpesaPaymentAction(slug, phone, total, coupon?.valid ? coupon.code : undefined);
    if (result.status === "success") {
      setStage("success");
      router.push(`/learn/${slug}?enrolled=success`);
    } else if (result.status === "pending") {
      setPendingPaymentId(result.paymentId);
      setStage("mpesa-pending");
    } else {
      setErrorMessage(result.message);
      setStage("failed");
    }
  }

  async function payWithCard() {
    setErrorMessage(null);
    setStage("card-processing");
    await sleep(2000);
    const result = await attemptCardPaymentAction(slug, cardNumber, expiry, cvv, total, coupon?.valid ? coupon.code : undefined);
    if (result.status === "success") {
      setStage("success");
      router.push(`/learn/${slug}?enrolled=success`);
    } else {
      setErrorMessage("message" in result ? result.message : "Payment failed.");
      setStage("failed");
    }
  }

  async function cancelPending() {
    if (pendingPaymentId) await cancelPendingPaymentAction(pendingPaymentId);
    setStage("form");
    setPendingPaymentId(null);
  }

  const busy = stage !== "form" && stage !== "failed";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-teal-100 bg-white p-6">
        {stage === "mpesa-sending" || stage === "mpesa-pin" || stage === "card-processing" ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
            <p className="font-medium text-ink">
              {stage === "mpesa-sending" && `Sending STK push to ${phone}…`}
              {stage === "mpesa-pin" && "Enter your M-Pesa PIN on your phone…"}
              {stage === "card-processing" && "Processing payment…"}
            </p>
          </div>
        ) : stage === "mpesa-pending" ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="h-10 w-10 animate-pulse rounded-full bg-gold-200" />
            <p className="font-medium text-ink">Waiting for confirmation on your phone…</p>
            <p className="text-sm text-ink/50">This can take a moment in real life. In this demo it stays pending.</p>
            <button
              type="button"
              onClick={cancelPending}
              className="rounded-full border border-teal-100 px-5 py-2 text-sm font-medium text-ink/70 hover:bg-teal-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl text-teal-900">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("mpesa")}
                className={`rounded-xl border-2 p-4 text-left transition ${method === "mpesa" ? "border-teal-600 bg-teal-50" : "border-teal-100"}`}
              >
                <p className="font-semibold text-ink">M-Pesa</p>
                <p className="text-sm text-ink/60">Pay via STK push to your phone</p>
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`rounded-xl border-2 p-4 text-left transition ${method === "card" ? "border-teal-600 bg-teal-50" : "border-teal-100"}`}
              >
                <p className="font-semibold text-ink">Card</p>
                <p className="text-sm text-ink/60">Visa, Mastercard</p>
              </button>
            </div>

            {method === "mpesa" ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="phone" className="text-sm font-medium text-ink/70">
                    M-Pesa phone number
                  </label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="2547XXXXXXXX"
                    className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-ink/40">
                    Demo: numbers ending 0000 fail, ending 1111 stay pending, anything else succeeds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={payWithMpesa}
                  disabled={busy}
                  className="w-full rounded-full bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
                >
                  Pay with M-Pesa
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="cardNumber" className="text-sm font-medium text-ink/70">
                    Card number
                  </label>
                  <input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-ink/40">
                    Demo: numbers ending 0000 are declined, ending 0002 fail for insufficient funds.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="text-sm font-medium text-ink/70">
                      Expiry (MM/YY)
                    </label>
                    <input
                      id="expiry"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="12/28"
                      className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="text-sm font-medium text-ink/70">
                      CVV
                    </label>
                    <input
                      id="cvv"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cardName" className="text-sm font-medium text-ink/70">
                    Cardholder name
                  </label>
                  <input
                    id="cardName"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={payWithCard}
                  disabled={busy}
                  className="w-full rounded-full bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
                >
                  Pay {fmt(total)}
                </button>
              </div>
            )}

            {stage === "failed" && errorMessage && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
            )}

            <p className="mt-6 rounded-lg bg-gold-50 px-4 py-2 text-xs text-gold-700">
              This is a demo — no real payment is processed.
            </p>
          </>
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
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Coupon code"
            className="min-w-0 flex-1 rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={couponPending}
            className="shrink-0 rounded-lg border border-teal-600 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            Apply
          </button>
        </div>
        {coupon && !coupon.valid && <p className="mt-2 text-xs text-red-600">{coupon.error}</p>}
        {coupon?.valid && <p className="mt-2 text-xs text-teal-700">Coupon {coupon.code} applied.</p>}

        <div className="mt-4 space-y-2 border-t border-teal-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/60">Subtotal</span>
            <span>{fmt(priceKes)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-teal-700">
              <span>Discount</span>
              <span>-{fmt(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-teal-100 pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        <div className="mt-4 flex rounded-full bg-teal-50 p-1 text-xs font-medium">
          {(["KES", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`flex-1 rounded-full py-1.5 transition ${currency === c ? "bg-white text-teal-700 shadow-sm" : "text-ink/50"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
