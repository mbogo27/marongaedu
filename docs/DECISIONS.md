# Decisions

Where the spec left a choice or the repo conflicted with it, what was chosen and why.
Format: **decision** — reasoning — *spec reference*.

## Stack

1. **Keep custom auth; do not adopt Better Auth / Auth.js.** The repo already had a bcrypt + DB-session design that follows Next.js's own authentication guide, and every §3 requirement (verification, reset, sessions page, rate limiting, invites, no enumeration) is implemented on top of it with a schema that mirrors the spec (`accounts`, `sessions`, `verification_tokens`). No custom cryptography: bcrypt cost 12, SHA-256 of random 32-byte tokens, HMAC-SHA256 for signed URLs. — *§0.2, §3.1*
2. **PostgreSQL via Prisma 7 + `@prisma/adapter-pg`.** Replaces SQLite. v2 had never been deployed, so the migration history was reset to a single baseline (`init`) instead of writing a data migration; there was no production data to preserve. `docker-compose.yml` provides local Postgres. — *§10, §11*
3. **Opaque session tokens, not JWTs.** The cookie holds `<r|s>.<random>`; only `sha256(random)` is stored. Revocation is deleting a row (instant), and a DB leak yields no usable sessions. `proxy.ts` (which must live in `src/` when a `src` dir is used) can therefore only check cookie *presence*; every real check is in `src/lib/dal.ts`. — *§3.6, §0.4*
4. **No UI framework swap.** The repo's Tailwind component set, a hand-built video player, and Zod-validated server actions were kept instead of adding shadcn/ui, React Hook Form, Plyr/Vidstack. The player implements everything §5.3 lists (speed, captions, PiP, fullscreen, keyboard shortcuts, resume, signed-URL refresh) with zero extra dependencies. — *§11 ("keep what the repo has")*
5. **Email templates are typed TypeScript functions, not React Email/MJML.** Each template is a subject + plain-text body with `{{merge tags}}` rendered into one branded HTML layout, with an automatic plain-text alternative. This is exactly what admin overrides need (edit subject/body with merge tags), keeps one code path for defaults and overrides, and avoids a heavy render dependency. Swapping in React Email only changes `renderEmail`. — *§4*
6. **Resend is called through its REST API**, not the SDK — one `fetch`, no dependency. The console adapter (dev default) also writes to the admin notifications feed and stores the plain-text body in `email_log` so tests can read links. — *§4*

## Security

7. **Sign-up does not auto-sign-in.** §3.2 asks both for "sign the user in" and for "no account enumeration". They conflict: an immediate session (a `Set-Cookie`, a redirect target) is observable and distinguishes new from existing emails. Both outcomes now go to the same `/signup/check-inbox` page; the new user verifies by email and logs in. The existing-address owner gets the "someone tried to sign up" notice. Password hashing runs in both branches to equalise timing. — *§3.2*
8. **Login rate limiting counts failures** (5/email and 20/IP per 15 min), checked with `peek` before attempting so a blocked account cannot be tested further even with the right password. Limiter state lives in Postgres by default (shared across instances); `memory` is rejected by env validation in production; `upstash` is implemented. — *§3.7*
9. **CSP is nonce-based** (set in `proxy.ts`, `strict-dynamic`, no `unsafe-eval` in production). This forces dynamic rendering for every page; see "Performance" below. — *§12*
10. **Rich text is sanitised twice**: on every save (`sanitize-html` allow-list) and again at render, so content that predates the sanitiser or is edited in the database can never reach a page unfiltered. — *§11, §12*
11. **Common-password check** ships the SecLists top-10k as a bundled module (no runtime file reads, so it works in serverless bundles) and also rejects a common word with digits/symbols appended. The strength meter is a local entropy estimate (no zxcvbn dictionaries sent to browsers). — *§3.2*
12. **Account deletion keeps accounting records.** The user row is anonymised (`Deleted user`, tombstone email), credentials/sessions/tokens/notes/wishlist removed, reviews soft-deleted, payments and enrollments kept. The public certificate snapshot name is also anonymised, so a verification page no longer shows a deleted person's name. OAuth-only users confirm by typing their email. — *§3.6*
13. **Non-admins get 404 on `/admin/*`, including guests and the old `/admin/login`.** Admins use the shared `/login`. Route handlers under `(protected)` re-check and return 404. — *§3.8*

## Commerce

14. **Simulated providers are stateless.** The M-Pesa "reference" encodes the STK start time and the trigger selected by the phone suffix (`ok`/`fail`/`hold`); `getStatus` derives the outcome from the clock. That works on serverless without a job queue and keeps the real-provider seam (`initiate` → `getStatus` → webhook) identical. The card simulator is synchronous. Card numbers must be **Luhn-valid** *and* end in `0000`/`0002` to trigger declines (see README for ready-made numbers). — *§7*
15. **Idempotency has three layers**: a client-minted key per attempt (unique in the DB), reuse of any PENDING payment for the same user+course in the last 30 minutes, and a Postgres advisory lock around creation. The success transition is a single `UPDATE … WHERE status='PENDING'`, so concurrent pollers cannot double-enroll. — *§7.2*
16. **A coupon that brings the total to KES 0 completes without a provider** (method `FREE`). An invalid coupon makes checkout fail instead of silently charging full price. — *§7*
17. **Money is integer KES.** `Intl.NumberFormat('en-KE')` renders it as "Ksh 8,500". USD is a display-only toggle stored in a cookie; the rate comes from Settings. — *§7.4*
18. **A payment can back many enrollment rows over time** (`Payment.enrollmentId` is not unique) because re-buying after a refund reactivates the same enrollment and keeps progress. — *§5.2*

## Learning

19. **Sequential unlocking** locks lesson *n* until lesson *n−1* is complete **and** itself unlocked (so completing a later lesson out of band cannot unlock past an incomplete one). Admins and free-preview guests bypass it. Quizzes complete only by passing; a failed retake never un-completes. — *§5.3*
20. **Quiz answers never leave the server before grading.** The lesson payload has no `isCorrect`/explanations; the graded result returns correct option ids and explanations. Unknown option ids in a submission are ignored. — *§5.3*
21. **Lessons are accessed through one function** (`getLessonView`) used by the page, the preview modal and `/api/lessons/:id`, so the rules (free preview / active enrollment / admin / sequential) exist once. Private media URLs are HMAC-signed with a 1-hour TTL; the player fetches a fresh one on error. — *§5.3, §8*
22. **Discussions are implemented** (flag `FEATURE_DISCUSSIONS`, default off): per-lesson threads, instructor badge, admin hide. — *§5.3 (optional)*
23. **Ratings and enrollment counts are always computed** from live rows (published, non-deleted reviews; active enrollments), never stored. — *§5.1*
24. **Search** uses Postgres full-text (`websearch_to_tsquery`) over title/subtitle/short description/lesson titles plus `ILIKE` for partial words. — *§5.1*

## Admin

25. **The course editor syncs by id instead of replacing the curriculum.** The previous delete-and-recreate approach would cascade-delete learner progress, notes and quiz attempts on every save. New rows reuse client-minted ids; ids that belong to another course are rejected. Autosave (3 s debounce) never changes status or writes audit rows. — *§6*
26. **Publish checklist**: title, slug, category, thumbnail and ≥1 module with a lesson are required (enforced server-side too); short description, price, video sources and quiz validity are advisory. — *§6*
27. **Uploads go straight to storage** via presigned PUTs (MIME + size validated before the URL is minted; the local provider additionally sniffs magic bytes). Lesson videos/captions/resources are `private/`, thumbnails/avatars/intro videos are `public/`. — *§6, §8*

## Scope notes

28. **Google OAuth is designed, not built** (§3.10): `accounts` table, no code assumes a password, the account-linking rule is implemented and unit-tested (`linkOrCreateOAuthUser`), `AUTH_GOOGLE_ENABLED` renders the button, and the callback route returns a documented 501.
29. **i18n**: user-facing strings in auth, account, checkout, learning and validation flow through `t()` (`src/lib/i18n`). Static marketing copy in some pages is still inline — see GAP.md.
30. **Analytics**: one `track()` seam with the full event list; only the console adapter is implemented (PostHog/Plausible/GA4 register in `src/lib/analytics.ts`).
31. **Performance**: because the header reads the session cookie and CSP uses nonces, public pages are server-rendered per request rather than ISR. Catalog queries are indexed and the whole matching set is ranked in memory, which is fine for hundreds of courses; revisit with a cached anonymous shell if the catalog grows large.
32. **E2E runs against branded Chrome** (`channel: "chrome"`), because the placeholder videos are H.264, which Playwright's bundled Chromium cannot decode.
