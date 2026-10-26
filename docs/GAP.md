# Gap analysis — final state

Audit of the repo against `SPEC-v2-full-lms.md`. Status: **done** · **partial** (works, with a stated limit) · **deferred** (explicitly out of this phase, with the reason).

"Verified" means covered by an automated test (Vitest = `tests/unit` + `tests/integration`, E2E = `tests/e2e`) or exercised by the seed + walkthrough. Anything not verified against a live external service says so.

## Baseline (P0)

| Item | Status | Where | Notes |
|---|---|---|---|
| Starting point | done | — | v2 branch had SQLite, an unprotected `proxy.ts` at the repo root (ignored by Next, so the guards and CSP never ran), no email/storage/payment adapters, no tests. |
| Postgres + Prisma, `docker-compose.yml` | done | `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`, `docker-compose.yml` | Prisma 7 with `@prisma/adapter-pg`. Migrations in `prisma/migrations`. |
| Zod-parsed env, fail fast | done | `src/lib/env.ts`, `src/instrumentation.ts` | Every §17 variable documented in `.env.example`. |
| `.env.example` tracked | done | `.gitignore` (`!.env.example`) | Was previously swallowed by `.env*`. |
| CI workflow | done | `.github/workflows/ci.yml` | typecheck, lint, Vitest, build, Playwright against a Postgres service. **Not yet observed running on GitHub**; the same steps pass locally (`npm run ci`). |
| `docs/DECISIONS.md`, `ARCHITECTURE.md`, `WALKTHROUGH.md`, `README.md` | done | `docs/`, `README.md` | |

## §2–3 Roles and authentication

| Requirement | Status | Where | Notes |
|---|---|---|---|
| Roles ADMIN / LEARNER, status, soft delete | done | schema `User`, `src/lib/dal.ts` | Vitest: `auth.test.ts`. |
| Library choice (§3.1) | done (alternative) | `src/lib/session.ts`, `src/lib/auth/*` | Custom bcrypt (cost 12) + opaque DB sessions instead of Better Auth. Reasoning in DECISIONS #1, #3. |
| Sign up, policy, no enumeration, verification email | done | `src/lib/actions/auth.ts`, `src/lib/auth/users.ts` | Sign-up does not auto-sign-in (DECISIONS #7). E2E `02-auth`. |
| Password policy (min 10, common-password list, strength meter) | done | `src/lib/password-policy.ts`, `src/lib/auth/common-passwords.ts` | |
| Email verification (hashed, single-use, expiring tokens) | done | `src/lib/auth/verification.ts`, `src/lib/tokens.ts` | Atomic `UPDATE … WHERE usedAt IS NULL`. |
| Sign in, remember me, sign out, sign out other sessions | done | `src/lib/actions/auth.ts`, `src/lib/actions/account.ts` | |
| Forgot / reset password revokes all sessions | done | `src/lib/auth/verification.ts` | Expired and reused tokens rejected (Vitest + E2E). |
| Account page: sessions list, change password, change email (confirm), delete account | done | `src/app/account`, `src/lib/auth/anonymise.ts` | Deletion anonymises, keeps accounting rows (DECISIONS #12). |
| Rate limiting (login, reset, signup, contact, newsletter) | done | `src/lib/rate-limit.ts` | db / upstash / memory providers. Upstash adapter **not run against a live Upstash**. |
| Turnstile | partial | `src/lib/turnstile.ts` | Server verification implemented behind `TURNSTILE_ENABLED`; widget not rendered in forms (off by default). |
| Admin bootstrap CLI, invites | done | `scripts/create-admin.ts`, `src/lib/actions/invite.ts`, `/invite` | |
| Route protection (`proxy.ts` + DAL) | done | `src/proxy.ts`, `src/lib/dal.ts` | DAL is the real check. Non-admins get 404 on `/admin/*`. |
| Google OAuth | deferred (by spec) | `src/lib/auth/oauth.ts`, `Account` table, `api/auth/google` (501) | Designed only: `accounts` table, no code assumes a password, link rule implemented. See README "Enabling Google". |
| Audit entries for auth failures | done | `src/lib/audit.ts` | AC 14. |

## §4 Email

| Requirement | Status | Where | Notes |
|---|---|---|---|
| Provider adapter (console / Resend), `email_log` | done | `src/lib/email/*` | Resend via REST; **not sent against a live Resend account**. |
| 16 transactional templates, merge tags, admin-editable overrides | done | `src/lib/email/templates.ts`, `/admin/settings/emails` | Plain-text + simple HTML; no React Email (DECISIONS #5). |
| Email never blocks or throws into a flow | done | `src/lib/email/send.ts` | |
| Admin digest | deferred | settings toggles only | Preference is stored; no scheduled job. Needs a cron host. |

## §5 Learner experience

| Requirement | Status | Where | Notes |
|---|---|---|---|
| Catalog: search, filters, sort, pagination, category pages | done | `src/lib/queries.ts`, `/courses`, `/categories/[slug]` | Postgres FTS. E2E `01-catalog`. |
| Course page: curriculum, previews, reviews, JSON-LD, sticky enroll bar | done | `/courses/[slug]` | |
| Slug redirects | done | `SlugRedirect`, `resolveSlugRedirect` | Vitest. |
| Enrollment rules (free one-click, caps, windows, gate) | done | `src/lib/enrollment.ts`, `src/lib/domain/enrollment-rules.ts` | Advisory-lock serialised. |
| Learning view: video / reading / quiz / download lessons, resume, notes, sidebar drawer | done | `/learn/[slug]`, `src/components/learn/*` | E2E `03-learning`. |
| Server-side access control for lessons and media | done | `src/lib/lesson-access.ts`, `/api/lessons/[id]`, `/media/[...key]` | AC 6, Vitest + E2E (direct requests). |
| Quiz grading server-side, attempts, pass mark | done | `src/lib/domain/quiz.ts`, `src/lib/actions/learn.ts` | Answers never sent before grading. |
| Sequential unlock | done | `isLessonLocked` | |
| Discussions | done (flagged) | `FEATURE_DISCUSSIONS` | Off by default, as in spec. |
| Dashboard, wishlist, certificates list | done | `/dashboard` | |
| Reviews: one per enrollment, moderation, votes, replies | done | `src/lib/actions/courses.ts`, `/admin/reviews` | |
| Static pages (about, contact, FAQ, legal) | done | `src/app/*` | Legal pages editable in admin settings. |

## §6 Admin back-office

| Requirement | Status | Where | Notes |
|---|---|---|---|
| Dashboard with date range and charts | done | `src/lib/admin-queries.ts`, `/admin` | |
| Course editor (basics, media, curriculum DnD, quiz builder, pricing, SEO, settings), autosave, publish checklist | done | `src/components/admin/CourseEditorForm.tsx`, `CurriculumBuilder.tsx` | Syncs by id, never delete-and-recreate (DECISIONS #25). |
| Uploads: presigned PUT, MIME + size validation | done | `src/lib/storage/*`, `/api/upload/local` | |
| Students, enrollments (manual enroll/revoke, CSV export), payments (refund, export), coupons, categories, reviews, messages, FAQs, notifications, audit log, team | done | `/admin/*` | CSV has a formula-injection guard. |
| Settings (site, email, legal, certificate layout + preview, currency rate) | done | `/admin/settings/*` | |
| Audit log of admin mutations | done | `src/lib/audit.ts` | |

## §7 Payments

| Requirement | Status | Where | Notes |
|---|---|---|---|
| Provider interface + simulated M-Pesa / card with every trigger | done | `src/lib/payments/*` | Stateless, derived from phone / card suffix. |
| State machine, server-side pricing, idempotency, polling | done | `src/lib/payments/service.ts` | Client price ignored (AC 9). E2E `04-checkout`. |
| Coupons (expired, exhausted, wrong course, per-user limit) | done | `src/lib/domain/pricing.ts` | Vitest. |
| Invoices (PDF), refunds (revoke access, email) | done | `src/lib/pdf.ts`, `refundPayment` | |
| Currency display (KES / USD toggle) | done | `src/lib/currency.ts` | Display-only; rate editable in settings. |
| Real Daraja / Paystack / Stripe | deferred (by spec §16) | `PaymentProvider` seam | |

## §8–9 Storage and certificates

| Requirement | Status | Where | Notes |
|---|---|---|---|
| Storage adapter local / S3, public vs private keys, signed URLs, Range streaming | done | `src/lib/storage/*`, `/media/[...key]` | **S3 adapter not exercised against a live bucket.** Local provider fully tested. |
| Certificates: issue on completion, `DENT-XXXX-XXXX` code, snapshot, PDF + QR, public verify, revoke with enrollment, verified email to download | done | `src/lib/certificates.ts`, `/verify/[code]`, `/certificates` | AC 13. |
| Video: HTML5 player with speed, captions, PiP, fullscreen, shortcuts, resume | done (alternative) | `src/components/VideoPlayer.tsx` | Custom player rather than Plyr / Vidstack (DECISIONS #4). HLS/DRM is a seam only (spec §16). |

## §10–11 Data model and stack

| Item | Status | Notes |
|---|---|---|
| Schema additions (§10) | done | See `prisma/schema.prisma`; two migrations. |
| Next.js, TS strict, Tailwind, dnd-kit, TipTap, Recharts, pdf-lib, Zod, Vitest, Playwright | done | |
| shadcn/ui, React Hook Form, React Email, Better Auth, Plyr/Vidstack | replaced | Documented alternatives (DECISIONS #1, #4, #5). Behaviour required by the spec is covered. |

## §12 Non-functional

| Requirement | Status | Notes |
|---|---|---|
| Security headers, nonce CSP, HSTS, sanitised rich text, signed URLs, hashed tokens, MIME + size checks, no secrets in client bundles | done | E2E asserts headers and a violation-free CSP run. |
| Responsive at 360px, drawer sidebar, sticky bar | done | E2E `06-accessibility` asserts no horizontal scroll on public, learner and admin pages. |
| WCAG 2.1 AA: landmarks, labels, focus, keyboard, captions | done | Axe (serious/critical) E2E on the AC 16 pages; keyboard tests for login, accordion, modal, quiz. |
| SEO: metadata, Course JSON-LD, sitemap, robots, canonical | done | `src/app/sitemap.ts`, `robots.ts`. |
| ISR for public pages | deferred | Nonce CSP + session-aware header force dynamic rendering (DECISIONS #9, #31). Mitigation: indexed queries, `next/image`. Revisit with hash-based CSP if LCP measurements demand it. |
| LCP < 2.5s on 4G | not measured | No Lighthouse run recorded. |
| Analytics `track()` adapter | partial | Console adapter + full event list; PostHog / Plausible / GA4 adapters register in `src/lib/analytics.ts` but are stubs. |
| i18n helper | partial | `src/lib/i18n`; auth, account, checkout, learning and validation strings go through `t()`. Static marketing copy and admin screens are still inline English. |
| Observability: error boundaries | done | |
| Sentry (optional) | deferred | `SENTRY_DSN` documented and parsed; SDK not wired. |

## §13–15 Testing and acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| 1 Guest browse / preview | done | E2E `01-catalog` |
| 2 Sign up + verification, no enumeration | done | E2E `02-auth`, Vitest `auth` |
| 3 Sign in, remember me, sign out others | done | E2E `02-auth` |
| 4 Forgot / reset | done | E2E `02-auth`, Vitest |
| 5 Free enroll | done | E2E `03-learning` |
| 6 Paid content blocked for non-enrolled | done | E2E `03-learning`, Vitest `learning` |
| 7 Complete lessons, progress persists, server grading | done | E2E `03-learning`, Vitest |
| 8 Paid purchase (M-Pesa + card triggers), no double charge | done | E2E `04-checkout`, Vitest `commerce` |
| 9 Coupons, server ignores client price | done | Vitest `commerce`, E2E `04-checkout` |
| 10 Admin creates course end to end | done | E2E `05-admin` |
| 11 Invite admin, 404 for non-admins | done | E2E `05-admin` |
| 12 Refund | done | E2E `04-checkout` / `05-admin`, Vitest |
| 13 Certificate issue / download / verify / revoke | done | E2E `03-learning`, Vitest |
| 14 Rate limits + audit | done | Vitest `security`, E2E `02-auth` |
| 15 Google documented | done | README, `.env.example` |
| 16 360px / keyboard / axe | done | E2E `06-accessibility` |
| 17 Seed | done | `prisma/seed.ts` (admin, unverified learner, 0 / 40 / 100% learners, refunded and failed payments) |
| 18 CI | partial | Pipeline defined; steps pass locally; first GitHub run still to be observed. |

Test counts and the latest results are recorded in the README and the final handover note; they are not repeated here so this file cannot go stale.

## Deferred / not done — summary

1. Google OAuth (spec §16).
2. Real payment providers (spec §16).
3. ISR / static public pages (nonce CSP trade-off).
4. Sentry SDK; PostHog / Plausible / GA4 adapters.
5. Admin email digest job.
6. Turnstile widget in the forms (server check exists).
7. Full i18n coverage of marketing and admin copy.
8. Lighthouse numbers.
9. Live verification of the S3, Resend and Upstash adapters.
10. First CI run on GitHub.
11. Hosting decision and merge to `main` — intentionally left to the owner.
