import { describe, expect, it } from "vitest";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { safeRedirect } from "@/lib/request";
import { csvField } from "@/lib/csv";
import { passwordStrength } from "@/lib/password-policy";
import { isCommonPassword } from "@/lib/auth/password";
import { hashToken, randomCode, randomToken } from "@/lib/tokens";
import { parseEnv } from "@/lib/env";
import { cardBrand, isValidCvv, isValidExpiry, isValidLuhn, isValidMpesaPhone } from "@/lib/payments/validation";
import { SimulatedCardProvider, SimulatedMpesaProvider, MPESA_SIM_DELAY_MS } from "@/lib/payments/simulated";
import { makeCertificateCode } from "@/lib/certificates";
import { parseLessonContent, resolveVideoReference, toEmbedUrl } from "@/lib/content-types";
import { MemoryLimiterForTests } from "../support/limiter";

describe("rich text sanitizer", () => {
  it("strips scripts, event handlers and javascript: URLs", () => {
    const dirty = '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src="x" onerror="alert(1)"><iframe src="//evil"></iframe>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|iframe/i);
    expect(clean).toContain("<p>Hi</p>");
  });
  it("keeps the formatting TipTap produces", () => {
    const ok = '<h2>T</h2><p><strong>b</strong> <em>i</em> <a href="https://example.com">l</a></p><ul><li>x</li></ul><pre><code class="language-ts">x</code></pre><img src="https://e.com/a.png" alt="a">';
    const out = sanitizeRichText(ok);
    for (const frag of ["<h2>", "<strong>", "<em>", 'href="https://example.com"', "<ul>", "language-ts", "<img"]) expect(out).toContain(frag);
  });
  it("adds rel=noopener to external links and blocks data: images", () => {
    expect(sanitizeRichText('<a href="https://example.com" target="_blank">x</a>')).toContain("noopener");
    expect(sanitizeRichText('<img src="data:text/html;base64,AAAA">')).not.toContain("data:");
  });
  it("stripHtml returns plain text", () => expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world"));
  it("handles empty input", () => {
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText("")).toBe("");
  });
});

describe("redirect validation (open-redirect guard)", () => {
  it.each(["/dashboard", "/courses/x?y=1", "/learn/a#b"])("accepts %s", (p) => expect(safeRedirect(p)).toBe(p));
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "", "/\u0000x", "http://localhost:3000/x", undefined, null, 42])(
    "rejects %s",
    (p) => expect(safeRedirect(p, "/fallback")).toBe("/fallback")
  );
});

describe("csv", () => {
  it("quotes fields and neutralises formula injection", () => {
    expect(csvField('a,"b"')).toBe('"a,""b"""');
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("+1")).toBe("'+1");
    expect(csvField(null)).toBe("");
    expect(csvField(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
  });
});

describe("passwords", () => {
  it("flags common passwords from the shipped 10k list", () => {
    expect(isCommonPassword("password")).toBe(true);
    expect(isCommonPassword("PASSWORD")).toBe(true);
    expect(isCommonPassword("password1234")).toBe(true); // common word + digits
    expect(isCommonPassword("Dragon2020!")).toBe(true);
    expect(isCommonPassword("xK9#mQ2!vL7$wZ")).toBe(false);
    expect(isCommonPassword("correct horse battery staple")).toBe(false);
  });
  it("scores strength sensibly", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("aaaaaaaaaa").score).toBe(0);
    expect(passwordStrength("abc").score).toBeLessThan(2);
    expect(passwordStrength("correct-Horse-battery-9!").score).toBeGreaterThanOrEqual(3);
  });
});

describe("tokens", () => {
  it("hashes deterministically and generates unique URL-safe tokens", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(randomToken()).not.toBe(t);
  });
  it("makes unambiguous short codes and certificate ids", () => {
    expect(randomCode(8)).toMatch(/^[2-9A-HJ-KM-NP-Z]{8}$/);
    expect(makeCertificateCode("dent")).toMatch(/^DENT-[2-9A-HJ-KM-NP-Z]{4}-[2-9A-HJ-KM-NP-Z]{4}$/);
  });
});

describe("env validation", () => {
  const ok = { DATABASE_URL: "postgresql://x@localhost/db", AUTH_SECRET: "a".repeat(32) };
  it("accepts a minimal valid environment and applies defaults", () => {
    const e = parseEnv(ok);
    expect(e.EMAIL_PROVIDER).toBe("console");
    expect(e.FEATURE_DISCUSSIONS).toBe(false);
    expect(e.RATE_LIMIT_PROVIDER).toBe("db");
  });
  it("treats empty strings as unset", () => expect(parseEnv({ ...ok, RESEND_API_KEY: "", S3_ENDPOINT: "" }).RESEND_API_KEY).toBeUndefined());
  it("fails fast with a readable message", () => {
    expect(() => parseEnv({ AUTH_SECRET: "short" })).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET/);
    expect(() => parseEnv({ ...ok, EMAIL_PROVIDER: "resend" })).toThrow(/RESEND_API_KEY/);
    expect(() => parseEnv({ ...ok, STORAGE_PROVIDER: "s3" })).toThrow(/S3_BUCKET_PRIVATE/);
    expect(() => parseEnv({ ...ok, AUTH_GOOGLE_ENABLED: "true" })).toThrow(/GOOGLE_CLIENT_ID/);
  });
  it("forbids dev-only settings in production", () => {
    expect(() => parseEnv({ ...ok, NODE_ENV: "production", RATE_LIMIT_PROVIDER: "memory" })).toThrow(/dev-only/);
    expect(() => parseEnv({ ...ok, NODE_ENV: "production", AUTH_SECRET: "a".repeat(20) })).toThrow(/32/);
  });
});

describe("payment validation + simulated providers", () => {
  it("validates cards", () => {
    expect(isValidLuhn("4242 4242 4242 4242")).toBe(true);
    expect(isValidLuhn("4242 4242 4242 4241")).toBe(false);
    expect(isValidLuhn("123")).toBe(false);
    expect(isValidExpiry("12/99", new Date("2026-06-01"))).toBe(true);
    expect(isValidExpiry("05/26", new Date("2026-06-01"))).toBe(false);
    expect(isValidExpiry("06/26", new Date("2026-06-15"))).toBe(true); // valid through month end
    expect(isValidExpiry("13/30")).toBe(false);
    expect(isValidCvv("123")).toBe(true);
    expect(isValidCvv("12")).toBe(false);
    expect(cardBrand("4242424242424242")).toBe("visa");
    expect(cardBrand("5555555555554444")).toBe("mastercard");
  });
  it("validates M-Pesa numbers", () => {
    expect(isValidMpesaPhone("254712345678")).toBe(true);
    expect(isValidMpesaPhone("0712345678")).toBe(false);
  });

  const card = new SimulatedCardProvider();
  const goodCard = { expiry: "12/99", cvv: "123", holder: "A" };
  it("card triggers: 0000 declined, 0002 insufficient funds, otherwise success without storing the PAN", async () => {
    expect(await card.initiate({ paymentId: "p", amountKes: 1, card: { ...goodCard, number: "4242 4200 0000 0000" } })).toMatchObject({ status: "failed", message: "Your card was declined." });
    // Luhn-valid number ending 0002
    expect(await card.initiate({ paymentId: "p", amountKes: 1, card: { ...goodCard, number: "4242 4200 0008 0002" } })).toMatchObject({ status: "failed", message: "Insufficient funds." });
    const ok = await card.initiate({ paymentId: "p", amountKes: 1, card: { ...goodCard, number: "4242 4242 4242 4242" } });
    expect(ok).toMatchObject({ status: "success", cardBrand: "visa", cardLast4: "4242" });
    expect(JSON.stringify(ok)).not.toContain("4242424242424242");
    expect(JSON.stringify(ok)).not.toContain("123");
    if (ok.status === "success") expect(ok.reference).toMatch(/^ch_demo_/);
  });
  it("rejects invalid card input server-side", async () => {
    expect(await card.initiate({ paymentId: "p", amountKes: 1, card: { ...goodCard, number: "1111 1111 1111 1112" } })).toMatchObject({ status: "failed" });
    expect(await card.initiate({ paymentId: "p", amountKes: 1, card: { number: "4242424242424242", expiry: "01/20", cvv: "123" } })).toMatchObject({ status: "failed" });
    expect(await card.initiate({ paymentId: "p", amountKes: 1, card: { number: "4242424242424242", expiry: "12/99", cvv: "1" } })).toMatchObject({ status: "failed" });
  });

  const mpesa = new SimulatedMpesaProvider();
  it("M-Pesa triggers resolve from the clock (stateless): ok -> success, 0000 -> failed, 1111 -> pending forever", async () => {
    const start = async (phone: string) => {
      const r = await mpesa.initiate({ paymentId: "pay1", amountKes: 1, phone });
      if (r.status !== "pending") throw new Error("expected pending");
      return r.reference;
    };
    const ok = await start("254712345678");
    expect(await mpesa.getStatus(ok)).toEqual({ status: "pending" }); // before the STK delay
    const aged = ok.replace(/^sim:\d+:/, `sim:${Date.now() - MPESA_SIM_DELAY_MS - 10}:`);
    const done = await mpesa.getStatus(aged);
    expect(done.status).toBe("success");
    if (done.status === "success") expect(done.reference).toMatch(/^MDEMO[0-9A-F]{8}$/);

    const fail = (await start("254712340000")).replace(/^sim:\d+:/, `sim:${Date.now() - 6000}:`);
    expect(await mpesa.getStatus(fail)).toMatchObject({ status: "failed", message: "Payment not confirmed. Try again." });

    const hold = (await start("254712341111")).replace(/^sim:\d+:/, `sim:${Date.now() - 600_000}:`);
    expect(await mpesa.getStatus(hold)).toEqual({ status: "pending" });
  });
  it("rejects a malformed phone without starting a push", async () => {
    expect(await mpesa.initiate({ paymentId: "p", amountKes: 1, phone: "0712" })).toMatchObject({ status: "failed" });
  });
});

describe("lesson content + video references", () => {
  it("falls back to defaults for malformed content", () => {
    expect(parseLessonContent("VIDEO", null)).toMatchObject({ type: "VIDEO", content: { source: "file", captions: [], attachments: [] } });
    expect(parseLessonContent("READING", { html: 5 })).toMatchObject({ type: "READING", content: { html: "" } });
  });
  it("turns watch links into embeds and rejects junk", () => {
    expect(toEmbedUrl("youtube", "https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(toEmbedUrl("youtube", "https://youtu.be/abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(toEmbedUrl("vimeo", "https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
    expect(toEmbedUrl("vimeo", "https://vimeo.com/channels/x")).toBeNull();
    expect(resolveVideoReference("https://youtu.be/abc")?.source).toBe("youtube");
    expect(resolveVideoReference("/media/public/x.mp4")).toEqual({ source: "file", src: "/media/public/x.mp4" });
    expect(resolveVideoReference("")).toBeNull();
  });
});

describe("rate limiter (memory implementation)", () => {
  it("blocks after the limit within a window and can be reset", async () => {
    const l = new MemoryLimiterForTests();
    for (let i = 0; i < 3; i++) expect((await l.consume("k", 3, 60)).blocked).toBe(false);
    const blocked = await l.consume("k", 3, 60);
    expect(blocked.blocked).toBe(true);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect((await l.peek("other", 3, 60)).blocked).toBe(false);
    await l.reset("k");
    expect((await l.peek("k", 3, 60)).count).toBe(0);
  });
});
