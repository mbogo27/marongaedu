@AGENTS.md

# Maronga — Dental E-Learning Platform (v2)

**What this is:** A full-stack build of `spec-2.md` — a dental
e-learning e-commerce platform for **Dr. Godfrey Maronga** ("Maronga
Dental Academy"). Real accounts, real (local) persistence, real learner
progress/certificates, full admin back-office. **Payments, email/SMS,
and Google OAuth are simulated stubs** per spec §6/§8 — everything else
is real.

> v1 — the earlier no-backend marketing demo built from `spec.md` — is
> preserved at git tag `v1-marketing-demo` / branch `main`. This work
> lives on branch `v2-ecommerce` and has not been merged/deployed; `main`
> still serves v1 on Vercel. See README.md for the full setup/demo-creds/
> acceptance-walkthrough writeup — this file covers conventions an agent
> needs before editing.

Stack: Next.js 16 (App Router, Turbopack, TypeScript), Tailwind CSS v4,
Prisma 7 + SQLite (driver-adapter model), custom session auth, TipTap,
`@dnd-kit`, Recharts, `pdf-lib`.

## Decisions already made (don't re-ask)

Carried over from v1, still true:
- **Instructor**: Dr. Godfrey Maronga, solo instructor
- **Market**: Kenya — KES pricing (`formatKes()` in `src/lib/format.ts`), USD toggle is display-only (hard-coded rate in `Setting` table, editable in `/admin/settings`)
- **Brand**: deep teal (`--teal-*`) + gold accent (`--gold-*`) on warm off-white (`--paper`), serif headings (Lora) + sans body (Inter) — unchanged from v1, defined in `src/app/globals.css`

New for v2:
- **DB**: SQLite via Prisma 7's driver-adapter model (`@prisma/adapter-better-sqlite3`). `datasource` blocks in `schema.prisma` no longer take a `url` — connection config lives in `prisma.config.ts` (CLI) and is wired into the adapter in `src/lib/db.ts` (runtime). `DATABASE_URL` is resolved relative to `process.cwd()`, not the schema file's directory.
- **Auth**: no NextAuth/Auth.js. Custom, per Next.js's own documented pattern (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`): bcrypt + `jose`-signed httpOnly cookie + DB `Session` table, `src/lib/dal.ts` (`server-only`, `verifySession()`/`requireUser()`/`requireAdmin()`) is the real authorization boundary. `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) only does cheap optimistic redirects — never trust it alone.
- **Video**: no more YouTube iframe embeds. Lessons play a real HTML5 `<video>` (speed/captions/PiP/fullscreen/resume-position — spec requires this and an iframe can't do it). `public/videos/placeholder-*.mp4` + `public/captions/placeholder-*.vtt` are a locally-generated (ffmpeg, offline, no download needed) pool of 10 clips; `scripts/generate-placeholder-videos.mjs` regenerates them.
- **"Rich text"** fields (course description, reading lessons) are stored as sanitized HTML strings, not TipTap JSON — TipTap is purely the editing UI (`editor.getHTML()` in, `dangerouslySetInnerHTML` out). Simplifies storage/rendering at no functional cost.
- **Course editor save model**: the whole editor (basics/media/curriculum/pricing/seo/settings tabs) is one client form; Save Draft/Publish submits everything together via `saveCourseAction` (`src/lib/actions/admin/courses.ts`), which replaces a course's outcomes/requirements/audience/modules/lessons/quiz in one transaction. No per-field autosave in the curriculum builder — reorders/edits are local React state until Save.

## Structure / where things live

- `prisma/schema.prisma` — full data model (~20 models: users, courses, modules, lessons w/ JSON `content` per type, quiz questions/options, enrollments, lesson progress, notes, reviews, payments, coupons, certificates, settings, ...). `Lesson.content` and other free-form fields are JSON `String`s, parsed via `src/lib/content-types.ts` (`parseLessonContent<T>()`), not Prisma `Json` columns — sidesteps SQLite `Json`-type quirks.
- `prisma/seed.ts` + `prisma/seed-data.ts` — full spec §10 demo dataset. Re-run with `npm run db:seed` (destructive — clears and repopulates).
- `src/lib/dal.ts`, `src/lib/session.ts`, `proxy.ts` — auth (see above)
- `src/lib/queries.ts`, `src/lib/admin-queries.ts` — read-side helpers (course listing/filtering/sorting, course detail, admin dashboard aggregates)
- `src/lib/actions/*.ts` — learner-facing server actions (auth, courses/enroll/wishlist/reviews, checkout, learn/progress/quiz/notes, account)
- `src/lib/actions/admin/*.ts` — admin server actions, one file per back-office section
- `src/lib/payments.ts` — the M-Pesa/Card stub simulation rules (phone/card suffix → outcome), Luhn/expiry validation
- `src/lib/storage.ts` — local-disk upload stub (`public/uploads/runtime/`) behind an interface a real object store can drop into
- `src/lib/pdf.ts` — certificate + invoice PDF generation (`pdf-lib`)
- `src/components/learn/*` — the `/learn/[slug]` experience (sidebar, per-lesson-type panes, notes, quiz)
- `src/components/admin/*` — course editor (`CourseEditorForm` + `CurriculumBuilder` + `RichTextEditor`), category/coupon modals, charts
- `src/app/admin/(protected)/**` — all admin pages, guarded by `layout.tsx` calling `requireAdmin()`. `/admin/login` sits outside the route group (unprotected, obviously). **Route Handlers under `(protected)` are NOT covered by the layout** (layouts don't wrap `route.ts`) — each one (`enrollments/export`, `certificates/[id]/download`, `invoices/[paymentId]`) calls `requireAdmin()`/`getCurrentUser()` itself.

## Known quirks / things to revisit

- A Client Component (`"use client"` file) must never directly import and render a Server Component that touches the DB (e.g. `<SiteHeader />`) — Next.js would try to bundle `better-sqlite3` for the browser and the build breaks with `Module not found: Can't resolve 'fs'`. Split into a server `page.tsx` (renders `SiteHeader`/`SiteFooter`) + a client subcomponent for the interactive form. Hit this on `/forgot-password` and `/reset-password`; fixed by extracting `ForgotPasswordForm`/`ResetPasswordForm`.
- `SiteFooter` (rendered on nearly every page) contains `NewsletterForm`, which has its own `<form>` and an `input[name="email"]` — any page with the footer has *two* `name="email"` inputs and *three* `<form>` elements on it. Scope selectors/tests accordingly.
- Prisma 7 dropped `skipDuplicates` support for SQLite `createMany` (already unsupported pre-7 too) — omit it, don't pass `skipDuplicates: true`.
- Don't use `sm:h-auto` (or any breakpoint that drops height) on a `relative` parent of a Next `<Image fill>` — collapses to zero height. (Carried over from v1; still applies.)
- `RouteContext<'/path/[param]'>` is the Next 16 typed-routes helper for typing a Route Handler's `context.params` — generated at dev/build time, available globally without an import.

## Deployment

v1 is deployed via GitHub (`mbogo27/marongaedu`) → Vercel on `main`. v2
(`v2-ecommerce` branch) has not been merged or deployed. SQLite-on-disk
needs a persistent volume or hosted SQLite (Turso, etc.) to survive
Vercel's ephemeral filesystem across deploys — see README.md's
Deployment section before merging/shipping v2.
