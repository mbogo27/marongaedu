# Dental E-Learning Platform — Full LMS Specification (v2.0)

**Audience:** Claude Code (build agent). This document is the source of truth for completing the platform.
**Supersedes:** Spec v1.0 (`docs/spec-v1.0.md`) wherever the two conflict. Spec v1.0 remains the reference for page-level UI detail (layouts, fields, copy) — this spec does not repeat that detail; it defines what must now be **real**, **secure**, and **production-ready**.
**Client:** Dentist-educator (brand name, domain and sender email TBD — use config placeholders, never hard-code).

---

## 0. How to work on this spec (read first)

1. **Audit before building.** The repo may already contain a partial implementation from v1.0 (demo/stub build). Before writing new code:
   - Read the whole codebase, `package.json`, Prisma schema, routes, and any existing README.
   - Produce `docs/GAP.md`: a table of every requirement in this spec → status (`done` / `partial` / `missing` / `stub-to-replace`) → file(s) involved → notes.
   - Get the baseline green: install, typecheck, lint, build, migrate, seed. Fix anything broken first.
2. **Keep the existing stack** if it matches §11. If something in the repo conflicts with this spec (e.g. auth library), prefer migrating to the spec only if the existing choice can't meet the requirements in §3; record the decision in `docs/DECISIONS.md`.
3. **Work in the phases of §14, in order.** Commit at the end of each phase with a clear message. Update `docs/GAP.md` as items close.
4. **Every requirement is enforced server-side.** UI hiding is never a security control. Middleware is a convenience, not the check — every server action, route handler and data loader re-checks auth and permissions.
5. **Preserve the adapter boundaries** (auth providers, email, storage, video, payments, analytics). Real providers must swap in by config, not by rewriting features.
6. When something in this spec is ambiguous, pick the simplest option that satisfies the acceptance criteria (§15), note it in `docs/DECISIONS.md`, and keep going. Do not stop to ask unless a decision is irreversible (e.g. destructive migration on existing data).

---

## 1. What changes from v1.0

| Area | v1.0 (demo) | v2.0 (this spec) |
|---|---|---|
| Auth | Stubbed / mock Google | **Real email + password auth** with verification, reset, sessions, rate limiting. Google OAuth **designed for, not built** (§3.10). |
| Email | Logged to console / admin feed | **Real transactional email** via provider adapter (Resend default), console adapter in dev. |
| Data | Partially mock | **Everything persisted** in PostgreSQL. No hard-coded content in components. |
| Access control | Loose | **Enforced**: lesson content, video URLs, certificates, admin routes. |
| Media | `/public/videos` | **Storage adapter** (local in dev, S3-compatible e.g. Cloudflare R2 in prod) with signed URLs for paid content. |
| Payments | Client-side simulation | **Server-side simulated provider** behind a real payment interface (§7). Real M-Pesa/card = later phase. |
| Certificates | Mock | Real issuance on completion, PDF generation, public verification. |
| Quality | Demo | Tests (unit + E2E), security hardening, a11y, SEO, deploy docs. |

---

## 2. Roles and permissions

Roles: `learner`, `admin`. (Schema must allow adding `instructor` later — use an enum/string, not a boolean `isAdmin`.)

| Capability | Guest | Learner (unverified) | Learner (verified) | Admin |
|---|---|---|---|---|
| Browse catalog, course pages, free previews | ✓ | ✓ | ✓ | ✓ |
| Enroll (free or paid) | — (redirect to login) | ✓ | ✓ | ✓ |
| Consume enrolled course content | — | ✓ | ✓ | ✓ (all courses) |
| Write a review (enrolled only, one per course) | — | — | ✓ | — |
| Download / share certificate | — | — | ✓ | ✓ (any, for support) |
| Access `/admin/*` | — | — | — | ✓ |
| Suspended user | Cannot log in; existing sessions revoked | | | |

Unverified learners see a persistent banner with "Resend verification email".

---

## 3. Authentication (email + password)

### 3.1 Library
Use **Better Auth** (preferred — first-class email/password, verification, reset, sessions, rate limiting, Prisma adapter, trivial to add Google later) or **Auth.js v5** if already installed and it can meet every requirement below with **database-backed sessions**. Record the choice in `DECISIONS.md`. Do not roll custom crypto.

### 3.2 Sign up (`/signup`)
- Fields: full name, email, password, confirm password, accept Terms & Privacy checkbox (links open in new tab).
- Email normalised (trim, lowercase) and unique.
- Password policy: min 10 chars, must not be in a common-password list (ship a small top-10k list or use the library's check), strength meter in UI (zxcvbn or equivalent). No forced symbol rules.
- On success: create user (role `learner`, `emailVerifiedAt = null`), send verification email, sign the user in, redirect to `redirect` param or `/dashboard`.
- If email already exists: show the same generic success path ("Check your inbox") and send that address a "someone tried to sign up with your email — sign in or reset your password" email. **No account enumeration.**

### 3.3 Email verification
- Token: random, single-use, stored **hashed**, expires in 24h.
- Link: `/verify-email?token=…` → marks verified, invalidates token, shows success, links to dashboard.
- Expired/used token → friendly page with "Send a new link" (requires login).
- Resend: rate-limited (max 3/hour per user).
- **Gate:** verification is required to download/share certificates and to post reviews. Enrollment and learning are not blocked.

### 3.4 Sign in (`/login`)
- Email + password, "Remember me" checkbox, "Forgot password?" link.
- Generic error on failure: "Incorrect email or password."
- Session length: 30 days with Remember me, 24h (browser session) without. Sliding expiry.
- Suspended users: generic "This account is unavailable — contact support."
- After login, honour a **same-origin only** `redirect` param (validate it; reject absolute/external URLs).

### 3.5 Forgot / reset password
- `/forgot-password`: email input → always "If an account exists, we've sent a reset link." Rate-limited (3/hour per email, 10/hour per IP).
- Reset token: hashed, single-use, expires in 1h.
- `/reset-password?token=…`: new password + confirm (same policy) → on success **revoke all existing sessions** for that user, send "your password was changed" email, redirect to `/login` with toast.

### 3.6 Sessions and account security
- Database-backed sessions, httpOnly + Secure + SameSite=Lax cookie.
- Account page shows active sessions (device/browser, IP-derived approximate location optional, last active) with "Sign out" per session and "Sign out of all other sessions".
- Change password (requires current password) → revoke other sessions, notify by email.
- Change email (requires current password) → send verification to the **new** address; switch only after it's confirmed; notify the **old** address.
- Delete account: requires password + typed confirmation. Soft-delete user (`deletedAt`), anonymise PII (name → "Deleted user", email → unique tombstone), keep payment/enrollment rows for accounting, revoke sessions, hide reviews.

### 3.7 Rate limiting and abuse
- Login: 5 failed attempts per (email) per 15 min and 20 per IP per 15 min → temporary block with clear message. Log to audit log.
- Signup: 5 per IP per hour.
- Use the auth library's limiter if it supports persistent storage; otherwise a DB-backed or Upstash/Redis-backed limiter behind a `RateLimiter` interface. In-memory limiters are acceptable **only** in dev.
- Optional (config flag, off by default): Cloudflare Turnstile on signup/forgot-password.

### 3.8 Admin accounts
- **No admin self-signup.** Bootstrap the first admin via `pnpm admin:create --email … --name …` (CLI script, prompts for password or sends a set-password email) and via seed in dev.
- Admins can **invite** staff admins from `/admin/settings/team`: enter email → invite email with single-use link (72h) → set name + password → account created with role `admin`, already verified.
- Admins can promote/demote, suspend/unsuspend users (cannot demote or suspend themselves; at least one active admin must always exist).
- Admin area uses the same login page; non-admins hitting `/admin/*` get 404 (not 403 — don't advertise the route).

### 3.9 Route protection
- Middleware: redirect unauthenticated users from `/dashboard`, `/learn/*`, `/checkout/*`, `/account/*` to `/login?redirect=…`.
- Server-side guards (helpers like `requireUser()`, `requireAdmin()`, `requireEnrollment(courseId)`) used in **every** relevant server action, route handler and page loader.

### 3.10 Google OAuth — design now, build later
Do **not** build Google sign-in in this phase, but make adding it a config change:
- Separate `accounts` table (provider, providerAccountId, userId) from `users`. Email/password lives as a `credential` account (or the library's equivalent).
- No code may assume every user has a password (e.g. "Change password" becomes "Set a password" when none exists; account deletion falls back to email confirmation).
- Account-linking rule (document it, implement the hook if cheap): an OAuth sign-in with a **verified** email matching an existing user links to that user.
- Feature flag `AUTH_GOOGLE_ENABLED=false` — the Google button component exists but renders nothing while false.
- Document in README the exact steps to enable Google (env vars, callback URL).

---

## 4. Email

- `EmailProvider` interface: `send({ to, subject, react|html, text, tags })`.
- Adapters: `ConsoleEmailProvider` (dev default — prints and writes to admin notifications), `ResendEmailProvider` (prod). SMTP adapter optional.
- Templates with **React Email** (or MJML), each with a plain-text version. Branding (logo, colours, site name) pulled from settings.
- Admin-editable subject/body overrides with merge tags (`{{name}}`, `{{course}}`, `{{link}}`, …) per v1.0 §4.12 — fall back to the coded template when no override exists.
- Sending must not block the request path on failure: send after the DB transaction commits; log failures to `email_log` and surface in admin notifications.

**Transactional emails required:**
| Event | Recipient |
|---|---|
| Verify email | user |
| Signup attempt on existing account | user |
| Welcome (after verification) | user |
| Password reset link | user |
| Password changed | user |
| Email change — confirm new / notice to old | user |
| Admin invite | invitee |
| Enrollment confirmation (with receipt for paid) | learner |
| Payment failed | learner |
| Refund processed / access revoked | learner |
| Certificate issued | learner |
| New contact-form message | admin(s) |
| New enrollment / new review (digest-able, toggle in settings) | admin(s) |

Each learner email (except security emails) respects notification preferences on `/account`.

---

## 5. Learner experience — make it real

Implement all learner pages from v1.0 §3 against the database. Specific requirements:

### 5.1 Catalog and course pages
- Catalog filters, sort, search and pagination run **server-side** via URL search params (shareable, back-button safe).
- Search: Postgres full-text (title, subtitle, short description, lesson titles). `tsvector` column or Prisma raw query — keep it simple.
- Only `published` courses (and not soft-deleted) are public. Admins can preview drafts with a draft banner.
- Ratings and enrollment counts are computed (or cached columns updated transactionally) — never stored by hand.
- "Enroll" button state: `Enroll` / `Go to course` (enrolled) / `Sold out` (cap reached) / `Enrollment closed` (outside open/close dates).

### 5.2 Enrollment rules (server-enforced)
- Cannot enroll twice; cannot enroll when cap reached or outside window.
- Free course: one-click enroll → `/learn/:slug`.
- Paid course: checkout (§7). Enrollment created **only** when payment status becomes `success`.
- Refunded payment → enrollment status `revoked`; learner loses access immediately; progress is retained (in case of re-enrollment).

### 5.3 Learning view (`/learn/:slug`)
All of v1.0 §3.7, with:
- Content loaded through a guarded loader: returns lesson content only if lesson is free preview, user is enrolled (active), or user is admin.
- Video: HTML5 player (Plyr or Vidstack) with speed, captions (.vtt), fullscreen, PiP, keyboard shortcuts. Resume from `lastPositionSeconds` (save every ~10s and on pause/unload, debounced).
- Video URL is a **short-lived signed URL** (§8) fetched when the lesson opens — never embedded in public HTML for paid lessons. YouTube/Vimeo (unlisted) URLs supported as an alternative source type.
- Lesson auto-completion: video ≥ 90% watched, reading on "Mark as complete", quiz on pass. Manual "Mark complete / incomplete" always available (except quizzes).
- Sequential unlocking: **course setting** `requireSequential` (default off). When on, a lesson is locked until the previous is complete; a failed quiz (below pass mark, default 70%, configurable per quiz) blocks progression.
- Quizzes: questions/options from DB; grading on the **server** (never ship correct answers to the client before submission); store attempts (`quiz_attempts`) with score; show explanations after submission; unlimited retries (configurable max later).
- Progress % = completed lessons / total lessons, recomputed on each completion; course `completedAt` set at 100% → triggers certificate issuance (§9).
- Notes: per-lesson, autosave (debounced), optional video timestamp; clicking a timestamped note seeks the video. Notes list view across the course.
- Q&A/discussion: **behind feature flag `FEATURE_DISCUSSIONS`**, default off. If time allows, implement per-lesson threads (enrolled users + admin, admin replies badged, admin can hide).

### 5.4 Learner dashboard and account
- `/dashboard`: My courses (in progress / completed / all), Continue (last lesson), wishlist, certificates.
- `/account`: profile (name, avatar upload, bio optional), email & password (§3.6), sessions, notification preferences, purchase history with downloadable invoice PDF, delete account.

### 5.5 Reviews
- One per learner per course; must be enrolled and verified; editable by author; admin can hide/reply.
- Optional rule (setting): require ≥ 30% progress before reviewing.
- "Helpful" votes: one per user per review.

### 5.6 Static and marketing pages
About, Contact (stored + emailed + WhatsApp link from settings), FAQ (admin-editable list), Terms, Privacy, Refund Policy (admin rich-text from settings). Newsletter signup stores subscriber with double opt-in email (config flag; default on).

---

## 6. Admin back-office — make it real

Implement v1.0 §4 fully against the DB. Additional requirements:

- **Dashboard:** metrics and charts from real queries over seed data; date-range picker (7d / 30d / 12m / custom).
- **Course editor:**
  - Autosave drafts (debounced) + explicit Save / Publish; "unsaved changes" guard on navigation.
  - Drag-and-drop reordering of modules and lessons (dnd-kit); reorder persisted transactionally.
  - Uploads (thumbnail, preview video, lesson videos, captions, resources) via the storage adapter with progress bars and **direct-to-storage presigned uploads** for large files (don't stream big videos through the Next.js server). Max sizes configurable (default video 2 GB, other files 50 MB). Validate MIME types server-side.
  - Video duration auto-detected client-side from metadata where possible; editable.
  - Quiz builder: single, multiple, true/false; per-quiz pass mark.
  - Publish validation: cannot publish without title, slug, category, thumbnail, ≥1 module with ≥1 lesson; show a checklist.
  - Duplicate course (deep copy of modules/lessons/quizzes, status Draft, slug suffixed).
  - Slug changes create a redirect (`slug_redirects` table) so old links still work.
- **Students:** detail view with enrollments, progress per lesson, quiz attempts, payments, admin notes, audit trail; actions: manual enroll, revoke access, suspend, resend verification, send password reset.
- **Enrollments / Payments / Coupons / Reviews / Messages / Notifications:** as v1.0, all persisted; CSV export streams from the server.
- **Settings:** as v1.0 §4.12 plus Team (§3.8), feature flags display (read-only from env), currency rate.
- **Audit log** (`audit_log` table) for admin actions and security events (login failures, password changes, role changes, refunds, deletes, publishes). Viewable at `/admin/audit` with filters.

---

## 7. Payments (still simulated, now server-side and swappable)

Real M-Pesa (Daraja) and card (Paystack/Stripe) integrations are **out of scope** for this phase, but the architecture must be production-shaped.

### 7.1 Interface
```ts
interface PaymentProvider {
  id: 'mpesa' | 'card';
  initiate(input: { paymentId: string; amountKes: number; phone?: string; card?: CardInput }): Promise<InitiateResult>;
  getStatus(reference: string): Promise<PaymentStatus>;
  handleWebhook(req: Request): Promise<WebhookResult>; // stub implementations no-op
  refund(reference: string, amountKes?: number): Promise<RefundResult>;
}
```
Adapters: `SimulatedMpesaProvider`, `SimulatedCardProvider` (default, behaviour per v1.0 §6 trigger numbers). Provider selected by env `PAYMENTS_MODE=simulated`.

### 7.2 Flow
1. Checkout page posts to a server action: server **recomputes price** (sale price, coupon validity, per-user limits, enrollment cap) — the client never sends the amount.
2. Server creates `payments` row (`pending`) with idempotency key, calls `provider.initiate`.
3. M-Pesa simulated: client polls `/api/payments/:id/status` (every 2s, timeout 90s) while UI shows the STK messages; the simulated provider resolves according to trigger phone numbers. Pending-forever case supports Cancel (→ `cancelled`).
4. Card simulated: Luhn/expiry/CVV validated client- and server-side; **never persist card numbers** — store only brand + last4 in `payload`.
5. On `success`, in one transaction: mark payment success, record coupon usage, create enrollment, write notification, then send confirmation email.
6. Duplicate submissions are idempotent (same pending payment returned).
7. "Demo — no real payment is processed" banner visible whenever `PAYMENTS_MODE=simulated`.

### 7.3 Invoices and refunds
- Invoice PDF per successful payment (number sequence, seller details from settings, buyer, course, amounts, method, reference).
- Admin refund → `provider.refund` → status `refunded`, enrollment `revoked`, email learner, audit log.

### 7.4 Currency
Prices stored as **integer KES**. USD toggle is display-only using the rate in settings. Format with `Intl.NumberFormat`.

---

## 8. Media and storage

- `StorageProvider` interface: `putPresigned`, `getSignedUrl(key, ttl)`, `delete`, `publicUrl(key)`.
- Adapters: `LocalStorageProvider` (dev, serves via a guarded route handler), `S3StorageProvider` (Cloudflare R2 / AWS S3 / Backblaze — S3 API).
- Bucket layout: `public/` (thumbnails, avatars, OG images, instructor photos) vs `private/` (lesson videos, captions, resources, certificates). Private objects only reachable through signed URLs (default TTL 1h) issued after an access check.
- `VideoProvider` seam: today = storage file or YouTube/Vimeo URL; later = Bunny Stream / Mux / Cloudflare Stream (HLS, DRM-lite). Lesson content JSON stores `{ source: 'file'|'youtube'|'vimeo', key|url, captions[] }`.
- Image optimisation via `next/image` with remote patterns configured for the public bucket.

---

## 9. Certificates

- Issued automatically when an enrollment reaches 100% (idempotent — one per enrollment). Certificate stores a **snapshot** (learner name, course title, completion date, instructor name) so later edits don't alter issued certificates.
- ID: UUID plus a short human code (e.g. `DENT-7K3Q-9XPA`).
- `/certificates/:id` (owner or admin): rendered certificate + Download PDF (server-generated with pdf-lib or react-pdf, cached in private storage) + Share on LinkedIn (Add-to-profile URL with cert ID and verify URL).
- `/verify/:code` (public): valid / revoked / not found; shows learner name, course, date. Revoked when enrollment is revoked.
- Download requires verified email (§3.3).
- Template from admin settings (background image + positions for name/course/date/signature/ID/QR code to verify URL).

---

## 10. Data model changes

Start from v1.0 §5 and add/change (adapt names to the chosen auth library's schema):

- **users**: add `emailVerifiedAt`, `status` (`active`|`suspended`), `deletedAt`, `notificationPrefs` (jsonb), `lastLoginAt`. Remove `password_hash` from users if the library stores it on the credential account.
- **accounts**: `id, userId, providerId ('credential'|'google'), providerAccountId, passwordHash?, createdAt` — unique (`providerId`, `providerAccountId`).
- **sessions**: `id, userId, tokenHash, expiresAt, ipAddress, userAgent, createdAt, lastActiveAt`.
- **verification_tokens**: `id, userId?, identifier, purpose ('verify_email'|'reset_password'|'change_email'|'admin_invite'|'newsletter_optin'), tokenHash, expiresAt, usedAt, meta jsonb`.
- **rate_limits** (if DB-backed): `key, count, windowStart`.
- **enrollments**: add `status` (`active`|`revoked`), `paymentId`.
- **lessons**: content jsonb per §8; add `requireSequential` on **courses**; add `passMark` on quiz lessons (in content or column).
- **quiz_attempts**: `id, enrollmentId, lessonId, answers jsonb, scorePercent, passed, createdAt`.
- **review_votes**: `reviewId, userId, helpful bool` (composite PK).
- **review_replies** (or `instructorReply` + `repliedAt` on reviews).
- **payments**: add `idempotencyKey` (unique), `currency` ('KES'), `cardBrand`, `cardLast4`, `phone`, `invoiceNumber` (unique, sequential), `refundedAt`.
- **certificates**: add `code` (unique), `snapshot` jsonb, `pdfKey`, `revokedAt`.
- **slug_redirects**: `fromSlug, courseId`.
- **audit_log**: `id, actorId?, action, targetType, targetId, meta jsonb, ip, createdAt`.
- **email_log**: `id, to, template, status, providerMessageId, error, createdAt`.
- **faqs**: `id, question, answer, sortOrder`.
- **subscribers**: add `confirmedAt`, `unsubscribedAt`, `unsubscribeToken`.

Rules: integer money (KES), `timestamptz` everywhere, indexes on all FKs, unique slugs/emails/codes, soft-delete on users, courses, reviews. Migrations must be non-destructive for any existing data — if v1 data exists, write a data migration.

---

## 11. Tech stack

Keep what v1.0 chose unless the repo differs:
- Next.js (App Router, latest stable) + TypeScript (strict).
- Tailwind CSS + shadcn/ui; dnd-kit for reordering; TipTap for rich text (sanitise output server-side with an allow-list, e.g. `sanitize-html`).
- PostgreSQL + Prisma (Neon/Supabase/Railway in prod; Docker Compose Postgres for local dev — provide `docker-compose.yml`).
- Better Auth (or Auth.js v5 per §3.1).
- Zod for all input validation (shared between client forms and server actions); React Hook Form for forms.
- React Email + Resend.
- Plyr or Vidstack for video.
- pdf-lib or @react-pdf/renderer for certificates and invoices.
- Recharts for admin charts.
- Vitest (unit/integration) + Playwright (E2E).
- Package manager: whatever the repo uses (default pnpm).

---

## 12. Non-functional requirements

- **Security:** OWASP top-10 basics; CSRF protection on mutations (library/server actions); strict input validation (Zod); rich-text sanitisation; security headers (CSP, HSTS, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy); no secrets in client bundles; signed URLs for private media; hashed tokens; argon2id (or bcrypt cost ≥ 12) via the auth library; no PII in logs; uploads validated by MIME + size.
- **Responsive:** mobile-first, works at 360px; sticky enroll bar on mobile; learning sidebar becomes a drawer on mobile.
- **Accessibility:** WCAG 2.1 AA — semantic landmarks, labels on all inputs, visible focus, keyboard-operable player/curriculum/modals, captions supported, contrast checked. Run axe in Playwright on key pages.
- **Performance:** SSR/ISR for public pages (revalidate on publish/update), lazy-loaded images, route-level code splitting, LCP < 2.5s on 4G for home and course pages.
- **SEO:** metadata per page, `Course` schema.org JSON-LD, `sitemap.xml` (published courses + categories + static pages), `robots.txt` (disallow `/admin`, `/learn`, `/dashboard`, `/checkout`, `/account`), canonical URLs, OG images.
- **Analytics:** `track(event, props)` adapter (console in dev; PostHog/Plausible/GA4 by env). Events as v1.0 §7 plus `signup_completed`, `email_verified`, `login`, `quiz_submitted`.
- **i18n:** English only; all user-facing strings through an i18n helper (next-intl or equivalent) so Swahili can be added.
- **Observability:** structured server logs; error boundary pages (404, 500, offline-friendly); optional Sentry via env.

---

## 13. Testing

- **Unit/integration (Vitest):** pricing + coupon calculation, permission guards, progress computation, quiz grading, token issuance/expiry, payment state machine, slug redirects.
- **E2E (Playwright)** — one spec per acceptance criterion in §15, run against a seeded test DB with the console email provider (tests read verification/reset links from the email log).
- CI script: `typecheck`, `lint`, `test`, `test:e2e`, `build`. Provide a GitHub Actions workflow.

---

## 14. Build phases

| Phase | Scope | Exit check |
|---|---|---|
| **P0 — Audit & baseline** | `docs/GAP.md`, `docs/DECISIONS.md`, fix build, docker-compose Postgres, env validation (Zod-parsed `env.ts`), CI skeleton | Clean install → migrate → seed → dev server runs; CI green |
| **P1 — Auth & email** | §3, §4, schema §10 auth tables, guards, middleware, admin CLI + invites, account page security sections | AC 2–4, 14–15 pass |
| **P2 — Catalog & learning (real data)** | §5.1–5.3, storage adapter (local) + signed URLs, progress, quizzes (server grading), notes | AC 1, 5–7 pass |
| **P3 — Admin CRUD & uploads** | §6, S3 adapter, presigned uploads, course editor complete, audit log | AC 10–11 pass |
| **P4 — Checkout, payments, coupons** | §7 end-to-end, invoices, refunds | AC 8–9, 12 pass |
| **P5 — Certificates & reviews** | §9, §5.5 | AC 13 pass |
| **P6 — Hardening & handover** | §12, full test suite, README, deploy guide, walkthrough notes | All AC pass; Lighthouse/axe checks recorded |

---

## 15. Acceptance criteria

1. A guest can browse, search, filter and sort the catalog, open a course, expand the curriculum, and play the course preview and free-preview lessons — without signing in.
2. A guest can sign up with email and password, receives a verification email, and verifying marks the account verified. Signing up with an existing email reveals nothing and sends a notice to that address.
3. A user can sign in, use "Remember me", sign out, and sign out other sessions from `/account`.
4. Forgot password sends a reset link; the reset sets a new password, revokes all sessions, and the old password no longer works. Expired or reused tokens are rejected.
5. A learner can enroll in a free course in one click and reach `/learn/:slug`.
6. Paid lesson content and video URLs cannot be accessed by a non-enrolled user (verified by direct URL/API requests, not just UI).
7. A learner can complete video, reading and quiz lessons; progress and video position persist across sessions and devices; quiz answers are graded server-side.
8. A learner can buy a paid course via simulated M-Pesa and simulated Card, including each failure/pending trigger from v1.0 §6; enrollment exists only after success; double-clicking Pay does not double-charge.
9. A coupon applies correctly at checkout; expired, exhausted and wrong-course coupons are rejected with clear messages; the server ignores any client-sent price.
10. An admin can create a course from scratch (basics → media uploads → modules and lessons incl. a quiz → pricing → publish) and it appears publicly immediately; unpublishing hides it.
11. An admin can invite another admin by email, who can set a password and log in. Non-admins get 404 on `/admin/*`.
12. An admin can refund a payment; the learner loses access and is emailed.
13. Completing all lessons issues a certificate (verified email required to download), downloadable as PDF, publicly verifiable at `/verify/:code`; revoking the enrollment revokes the certificate.
14. Login and password-reset endpoints are rate-limited and failures appear in the audit log.
15. Setting `AUTH_GOOGLE_ENABLED=true` with credentials is documented as the only step needed to add Google sign-in (code paths assume no password may exist).
16. All pages work at 360px, are keyboard-navigable, and pass axe with no serious/critical issues on: home, catalog, course detail, login, signup, checkout, learn, dashboard, admin course editor.
17. `pnpm db:seed` produces an immediately explorable app (seed data per v1.0 §10, plus: 1 admin, 1 unverified learner, 3 verified learners at 0% / 40% / 100% with a certificate, sample payments incl. one refunded, one failed).
18. CI passes: typecheck, lint, unit, E2E, build.

---

## 16. Out of scope (this phase)

- Google OAuth (designed for in §3.10), other social logins, 2FA (leave a seam: `users.twoFactorEnabled` not required yet).
- Real M-Pesa Daraja / Paystack / Stripe integration (adapter seam only).
- Managed video streaming (HLS/DRM) — seam only.
- Subscriptions/bundles, multi-instructor marketplace, live classes, mobile apps, Swahili translation, SMS notifications, CPD/CME accreditation fields (keep v1.0 §9 extensibility notes in mind).

---

## 17. Configuration (`.env.example` must document all)

```
DATABASE_URL=
APP_URL=http://localhost:3000
AUTH_SECRET=
AUTH_GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_PROVIDER=console            # console | resend
RESEND_API_KEY=
EMAIL_FROM="Site Name <no-reply@example.com>"
ADMIN_NOTIFY_EMAIL=
STORAGE_PROVIDER=local            # local | s3
S3_ENDPOINT=
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_PUBLIC=
S3_BUCKET_PRIVATE=
S3_PUBLIC_BASE_URL=
PAYMENTS_MODE=simulated
RATE_LIMIT_PROVIDER=db            # memory (dev only) | db | upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TURNSTILE_ENABLED=false
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
ANALYTICS_PROVIDER=console        # console | posthog | plausible | ga4
FEATURE_DISCUSSIONS=false
SENTRY_DSN=
```
Validate env at boot with Zod; fail fast with a readable message.

---

## 18. Deliverables

- Completed codebase, phases committed in order.
- `README.md`: prerequisites, local setup (docker-compose), env vars, migrate, seed, dev, test, admin bootstrap CLI, demo credentials, enabling Google later, switching email/storage providers, deployment (Vercel + Neon + R2 recommended; Node/VPS alternative with `next start` + pm2/systemd).
- `docs/GAP.md` (final state: all done or explicitly deferred), `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` (adapters, auth flow, access-control model, payment state machine diagram in Mermaid).
- `docs/WALKTHROUGH.md`: step-by-step script to demo every acceptance criterion to the client.

---

## 19. Open items for the client (use placeholders until answered)

1. Brand name, logo, colours, domain → drives `EMAIL_FROM`, certificate design, metadata.
2. Sender email domain for DNS (SPF/DKIM/DMARC on Resend).
3. Instructor credentials/signature image for certificates.
4. Pricing display: KES only, or KES + USD toggle at launch?
5. Refund policy terms (affects refund window logic later).
6. Which payment rails to go live with first (M-Pesa Daraja direct vs Paystack for both M-Pesa and card).

End of specification.
