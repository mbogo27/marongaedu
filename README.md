# Dental Academy: Full LMS

A dental e-learning platform: public catalog, paid and free courses, real accounts with email verification, a guarded learning experience, server-side checkout, certificates, and an admin back office. Payments run through a **simulated** provider behind a real interface; email, storage and rate limiting are production-shaped adapters.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · PostgreSQL + Prisma 7 · TipTap · dnd-kit · Recharts · pdf-lib · Vitest · Playwright.

Docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) · [`docs/GAP.md`](docs/GAP.md) · [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) · spec: [`SPEC-v2-full-lms.md`](SPEC-v2-full-lms.md)

## Prerequisites

Node 22+, npm, and PostgreSQL 15+ (Docker is the easy way). `ffmpeg` is only needed to regenerate the placeholder videos.

## Local setup

```bash
docker compose up -d            # Postgres on :5432 (maronga / maronga)
npm install                     # also runs `prisma generate`
cp .env.example .env            # defaults work for local dev
npm run db:migrate              # apply migrations (creates the schema)
npm run db:seed                 # demo data (wipes and rebuilds, deterministic)
npm run dev                     # http://localhost:3000
```

No Docker? Point `DATABASE_URL` at any Postgres. Reset everything with `npm run db:reset`.

### Environment

All variables are documented in [`.env.example`](.env.example) and validated at boot with Zod (`src/lib/env.ts`): a bad value stops the server with a readable message. The ones you will touch first:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `APP_URL` | Public base URL (emails, certificate links, sitemap) |
| `AUTH_SECRET` | ≥32 chars in production; signs media URLs (`openssl rand -base64 32`) |
| `EMAIL_PROVIDER` | `console` (default; also lists mail in Admin → Notifications) or `resend` (+ `RESEND_API_KEY`, `EMAIL_FROM`) |
| `STORAGE_PROVIDER` | `local` (`.storage/`) or `s3` (+ `S3_*`) |
| `RATE_LIMIT_PROVIDER` | `db` (default), `upstash`, or `memory` (dev only) |
| `PAYMENTS_MODE` | `simulated` (only mode implemented) |
| `AUTH_GOOGLE_ENABLED`, `FEATURE_DISCUSSIONS`, `TURNSTILE_ENABLED` | feature flags |

## Demo credentials

Password for every seeded account: **`Demo@1234`**

| Account | Email |
|---|---|
| Admin | `admin@demo.co.ke` |
| Learner at 0% | `learner0@demo.co.ke` |
| Learner at 40% | `learner40@demo.co.ke` |
| Learner at 100% (has a certificate) | `learner100@demo.co.ke` |
| Unverified learner | `unverified@demo.co.ke` |
| 15 more students | `student1@demo.co.ke` … `student15@demo.co.ke` |

Coupons: `WELCOME10` (10% off everything), `STUDENT500` (KES 500 off the first three courses, once per user), `EXPIRED`.
The seed also includes one refunded, one failed and one cancelled payment, reviews with votes and an instructor reply, FAQs, and a sequential-unlock course (*Running a Modern Dental Practice*).

### Payment simulator triggers

| Method | Input | Result |
|---|---|---|
| M-Pesa | phone ending `0000` | fails: "Payment not confirmed. Try again." |
| M-Pesa | phone ending `1111` | stays pending (Cancel available) |
| M-Pesa | any other `2547XXXXXXXX` | succeeds after ~5 s (receipt `MDEMO…`) |
| Card | `4242 4242 4242 4242` | succeeds (any future expiry, 3–4 digit CVV) |
| Card | `4242 4200 0000 0000` | declined |
| Card | `4242 4200 0008 0002` | insufficient funds |

Card numbers must pass the Luhn check *and* end in `0000`/`0002` to trigger a decline; the numbers above do. The server recomputes the price: the client never sends an amount.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `lint` | TypeScript · ESLint |
| `npm test` | Vitest unit + integration (uses `TEST_DATABASE_URL`, default `…/maronga_test`) |
| `npm run test:e2e` | Playwright (needs `npm run build`; uses branded Chrome and `E2E_DATABASE_URL`, default `…/maronga_e2e`; migrates + seeds it itself) |
| `npm run ci` | typecheck + lint + test + build |
| `npm run db:migrate` · `db:deploy` · `db:seed` · `db:reset` · `db:studio` | Prisma + seed |
| `npm run admin:create -- --email … --name "…"` | bootstrap an admin (prompts for a password; `--send-link` emails a set-password link instead; promotes the account if it already exists) |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit/integration, build and E2E against a Postgres service.

## Admin

Admins sign in at the normal `/login`. `/admin/*` returns **404** to everyone else. There is no admin self-signup: create the first admin with `npm run admin:create` (the seed creates `admin@demo.co.ke` for dev), then invite colleagues from **Admin → Settings → Team** (single-use link, 72 h). At least one active admin always remains; admins cannot demote or suspend themselves.

## Switching providers

- **Real email (Resend):** verify your sending domain (SPF/DKIM/DMARC), then set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM="Your Name <no-reply@yourdomain>"`, `ADMIN_NOTIFY_EMAIL`. Subjects/bodies are editable in Admin → Settings → Email templates. Failures are logged to `email_log` and the notifications feed and never block a request.
- **S3-compatible storage (Cloudflare R2 shown):** create two buckets, a **public** one (served via a CDN/`r2.dev` domain → `S3_PUBLIC_BASE_URL`) and a **private** one. Set `STORAGE_PROVIDER=s3`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE`, `S3_PUBLIC_BASE_URL`. Add a **CORS rule on both buckets** allowing `PUT` (and `GET`/`HEAD`) from `APP_URL` with `Content-Type` header: the admin uploader sends files straight from the browser using presigned URLs. Private objects (lesson videos, captions, resources, certificate PDFs) are only reachable through 1-hour signed URLs issued after an access check.
- **Rate limiting at scale:** `RATE_LIMIT_PROVIDER=upstash` with `UPSTASH_REDIS_REST_URL/TOKEN`.
- **Bot protection:** `TURNSTILE_ENABLED=true` + site/secret keys adds Cloudflare Turnstile to sign-up and forgot-password.
- **Real payments later:** implement `PaymentProvider` (`src/lib/payments/types.ts`) for Daraja or Paystack/Stripe, register it in `src/lib/payments/index.ts`, and add a webhook route that calls `finalizeSuccess`/`markFailed`. Checkout, polling, refunds and invoices need no change.

## Enabling Google sign-in later

Google is *designed for, not built* (spec §3.10). The `accounts` table, the verified-email linking rule (`src/lib/auth/oauth.ts`) and the feature flag are in place; no code assumes a password exists. To finish it:

1. In Google Cloud Console create an OAuth client; add the callback `${APP_URL}/api/auth/google/callback`.
2. Set `AUTH_GOOGLE_ENABLED=true`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. Implement the redirect/callback in `src/app/api/auth/google/route.ts` (currently a documented 501), calling `linkOrCreateOAuthUser` with the profile and then `createSession`.

The "Continue with Google" button appears automatically once the flag is on.

## Deployment

**Recommended: Vercel + Neon + Cloudflare R2 + Resend.**

1. Create a Neon database; set `DATABASE_URL` (pooled URL is fine) in Vercel.
2. Set all variables from `.env.example` in Vercel: `APP_URL`, a 32+ char `AUTH_SECRET`, `EMAIL_PROVIDER=resend` and keys, `STORAGE_PROVIDER=s3` and bucket settings, `RATE_LIMIT_PROVIDER=db` (or `upstash`).
3. Build command `npm run build`; run migrations on each deploy with `npm run db:deploy` (e.g. a Vercel build step or a CI job). Seed only a fresh demo environment; in production create the first admin with `npm run admin:create` against the production `DATABASE_URL`.
4. Configure R2 CORS as above and your Resend domain DNS.

**Node/VPS alternative:** `npm ci && npm run build && npm run db:deploy`, then `npm run start` under pm2 or systemd behind nginx/Caddy (TLS required: cookies are `Secure` and HSTS is sent in production). Use `STORAGE_PROVIDER=s3` unless the box has a persistent disk for `.storage/` (the local provider is single-node only).

Production checks: `NODE_ENV=production` rejects `RATE_LIMIT_PROVIDER=memory` and short `AUTH_SECRET`; payments stay simulated until a real provider is registered, and the "demo: no real payment" banner shows whenever `PAYMENTS_MODE=simulated`.

## Project layout

```
prisma/            schema, migrations, seed
src/app/           routes (public site, learner, /admin/(protected), API + media handlers)
src/lib/domain/    pure business rules (pricing, enrollment gate, progress, quiz grading)
src/lib/           auth, email, storage, payments, certificates, queries, services
src/lib/actions/   server actions (learner) and actions/admin (back office)
src/components/    UI (learn/, admin/, account/ …)
tests/             unit, integration (Postgres), e2e (Playwright + axe)
scripts/           admin bootstrap CLI, placeholder-video generator
docs/              architecture, decisions, gap analysis, demo walkthrough
```
