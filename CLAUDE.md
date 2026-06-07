@AGENTS.md

# Maronga — Dental E-Learning Demo

**What this is:** A clickable sales-demo build of `spec.md` — a Dental
E-Learning platform for **Dr. Godfrey Maronga** ("Maronga Dental Academy").
Not production: stubbed auth, payments, and persistence throughout. Built
to let the client click through and feel the product before committing.

Stack: Next.js 16 (App Router, TypeScript, Turbopack), Tailwind CSS v4.
No database — all content lives in `src/lib/data.ts`.

## Decisions already made (don't re-ask)

These resolve spec.md §7's open questions — answered by the client:

- **Instructor**: Dr. Godfrey Maronga, solo instructor (no guest lecturers for now)
- **Market**: Kenya — all prices shown in **KES** (`formatKes()` in `src/lib/data.ts`)
- **Pricing model**: flat one-time price per course (no bundles/subscriptions/CDP-CME)
- **Brand direction** (proposed by Claude, not yet client-confirmed): deep
  teal (`--teal-*`) + warm gold accent (`--gold-*`) on warm off-white
  (`--paper`), serif headings (Lora) + sans body (Inter), real photography
  over illustration, YouTube embeds for preview video
- **Brand assets**: client supplied a real headshot — `public/maronga.jpg`
  (also duplicated at repo root `maronga.jpg`), wired in via
  `instructor.photoUrl` in `src/lib/data.ts`. Course thumbnails / hero /
  other imagery still use Lorem Picsum seeded placeholders
  (`https://picsum.photos/seed/<seed>/...`) — swap for real photography
  before client launch.
- Preview video uses ONE shared placeholder YouTube ID
  (`PLACEHOLDER_VIDEO_ID` in `src/lib/data.ts`, currently Big Buck Bunny) —
  swap to Maronga's real footage later, single edit point.

## Structure / where things live

- `src/lib/types.ts` — Course, Module, Lesson, Testimonial, Student types
- `src/lib/data.ts` — ALL mock content: instructor bio, 6 courses (with
  full curricula/modules/lessons/outcomes/descriptions), testimonials,
  students, admin dashboard stats, `formatKes()`, `getCourseBySlug()`
- `src/components/` — shared UI: SiteHeader, SiteFooter, CourseCard,
  LevelBadge, VideoPlayer (poster→YouTube embed on click), CurriculumAccordion,
  EnrollButton (modal: order summary → processing → success), NewsletterForm
- `src/components/admin/` — AdminShell (sidebar layout), CourseEditorForm
  (curriculum builder: add/remove modules & lessons, toast on save)

## Routes built (all pass `next build` static generation)

Learner: `/` `/courses/[slug]` `/login` `/dashboard` (reads `?course=slug`
to show "enrolled" state with fake progress)

Admin: `/admin/login` `/admin` `/admin/courses` `/admin/courses/[slug]`
(also `/admin/courses/new`) `/admin/students`

## Auth (intentionally stubbed per spec §2.3/§3)

Both `/login` and `/admin/login` accept ANY email/password and route to
their dashboards after a fake delay — no real backend. Admin login email
field is pre-filled with `dr.maronga@marongadental.ac.ke`.

## Known quirks / things to revisit

- `next.config.ts` whitelists `picsum.photos` and `i.ytimg.com` as remote
  image hosts — update this list when swapping in real asset hosts.
- Enrollment flow passes the enrolled course via the `?course=` query
  param (no localStorage/session) — deliberate simplification for a demo.
- Don't use `sm:h-auto` (or any breakpoint that drops height) on a
  `relative` parent of a Next `<Image fill>` — collapses to zero height
  and the image silently disappears. Hit this once on the dashboard card;
  fixed by giving it a fixed height at every breakpoint.

## Deployment

Deployed via GitHub (`mbogo27/marongaedu`) → Vercel. See chat history /
ask the user for the live URL once deployed.
