# Dental E-Learning Platform — Full Specification

**Version:** 1.0
**Audience:** Build agent (Manus) — this spec is the source of truth for implementation.
**Scope:** Complete platform. Payments are stubbed (M-Pesa or Card selection with simulated success/failure flows). All other functionality is real and persistent.

---

## 1. Product summary

A web platform where a dentist-educator sells structured video courses to dental students, junior practitioners, and clinicians seeking continuing education. Learners discover courses, preview content, enroll (paid or free), consume video lessons, track progress, and receive completion certificates. The instructor manages everything through an admin back-office: courses, curriculum, students, enrollments, payments, coupons, and analytics.

**Core value:** Authoritative dental education from a practicing clinician, delivered in a clean, mobile-friendly learning environment.

---

## 2. User roles

| Role | Description | Access |
|---|---|---|
| **Guest** | Unauthenticated visitor | Browse marketing pages, view course listings, watch free preview lessons |
| **Learner** | Registered user | Guest access + enroll, consume paid content, track progress, download certificates |
| **Instructor/Admin** | The dentist (and any invited staff) | Full CRUD on courses, students, enrollments, categories, coupons; view analytics |

Single-tenant to start. Multi-instructor is out of scope for v1 but the data model should not preclude it (see §9).

---

## 3. Learner-facing site

### 3.1 Homepage (`/`)
- **Header:** logo, nav (Courses, Categories, About, Contact), Sign in / Sign up buttons (or profile menu if logged in).
- **Hero:** headline, subheadline, primary CTA ("Browse Courses"), secondary CTA ("Watch Free Preview"). Background: instructor photo or clinical imagery.
- **Featured courses:** 3–4 admin-flagged courses.
- **Browse by category:** grid of category tiles with icons and course counts.
- **All courses:** paginated grid, 12 per page, with filter/sort controls (see §3.2).
- **Instructor bio strip:** photo, name, credentials, one-paragraph bio, link to full about page.
- **Testimonials:** 3–6 learner quotes with name, role, photo.
- **CTA band:** "Start learning today" + Sign up button.
- **Footer:** links (About, Contact, Terms, Privacy, Refund Policy), social icons, newsletter signup (email → stored in `subscribers` table).

### 3.2 Course catalog (`/courses`)
- Grid of course cards: thumbnail, title, instructor name, level badge, duration, star rating, enrollment count, price (or "Free").
- **Filters (sidebar on desktop, drawer on mobile):**
  - Category (multi-select)
  - Level (Beginner / Intermediate / Advanced)
  - Price (Free / Paid / range slider)
  - Duration (< 2h / 2–5h / 5–10h / 10h+)
  - Rating (4★+, 3★+, etc.)
- **Sort:** Most popular, Newest, Price low→high, Price high→low, Highest rated.
- **Search bar** — searches title, description, lesson titles.
- Empty state when filters return nothing.

### 3.3 Category page (`/categories/:slug`)
- Same layout as `/courses` but pre-filtered. Category header with description.

### 3.4 Course detail page (`/courses/:slug`)
- **Header block:**
  - Left: title, subtitle, instructor byline (linked), level, duration, lesson count, last updated date, star rating with review count, enrollment count.
  - Right: **preview video player** (course intro video, autoplay off, poster image). Below player: price, "Enroll Now" CTA (or "Go to Course" if enrolled), "Add to Wishlist" heart, share buttons.
- **What you'll learn:** 4–8 outcome bullets in a 2-column grid.
- **Requirements/Prerequisites:** bulleted list.
- **Course description:** rich text.
- **Curriculum:**
  - List of modules. Each shows title, lesson count, total duration, expand/collapse chevron.
  - Expanded module shows lessons: title, duration, type icon (video / reading / quiz / resource), lock icon or "Preview" button if the lesson is free.
  - Clicking "Preview" opens a modal video player.
  - Global "Expand all / Collapse all" toggle.
- **Instructor block:** photo, name, credentials, bio, stats (courses taught, total students, average rating).
- **Reviews section:**
  - Overall rating with breakdown (5★ 60%, 4★ 25%, ...).
  - Individual reviews: learner name/avatar, rating, date, text, helpful/unhelpful vote.
  - Pagination or "Load more".
  - Enrolled learners see "Write a review" button (one review per learner per course).
- **Related courses:** 3–4 cards from the same category.
- **Sticky enroll bar** on scroll (mobile especially): price + Enroll CTA.

### 3.5 Auth pages
- **Sign up (`/signup`):** full name, email, password (strength meter), confirm password, T&C checkbox, Sign up button. "Sign up with Google" button (stub OAuth — accept and create a user with mock Google data). Link to Sign in.
- **Sign in (`/login`):** email, password, "Remember me", Sign in button, "Forgot password?" link, Google sign-in button, link to Sign up.
- **Forgot password (`/forgot-password`):** email → "If this email exists, we've sent a reset link" (stub — log to admin notifications).
- **Reset password (`/reset-password?token=…`):** new password + confirm → success → redirect to login.
- **Email verification:** on signup, mark user as unverified. Show a banner on protected pages: "Verify your email — resend link". Clicking a stub verification link marks them verified. Enrollment is not blocked by verification; certificate download is.

### 3.6 Enrollment & checkout flow

Triggered by "Enroll Now" on a course.

1. **If not logged in:** redirect to login with `?redirect=/courses/:slug/checkout`.
2. **Free courses:** skip payment. One-click enroll → success → redirect to learner course view.
3. **Paid courses — checkout page (`/checkout/:course-slug`):**
   - **Order summary (right side):** course thumbnail, title, price, coupon input ("Apply"), subtotal, discount, total (KES by default, USD toggle).
   - **Payment method (left side):** two selectable cards:
     - **M-Pesa:** phone number input (format: `2547XXXXXXXX`), "Pay with M-Pesa" button.
     - **Card:** card number, expiry (MM/YY), CVV, cardholder name, "Pay" button.
   - Selecting a method reveals its fields.
   - **Stubbed submission** — see §6 for full behavior.
   - Success → create enrollment record, redirect to `/learn/:course-slug` with a success toast.
   - Show a small "This is a demo — no real payment is processed" banner in dev/staging.
4. **Post-enrollment:** stub confirmation email (log to admin notifications panel).

### 3.7 Learning experience (`/learn/:course-slug`)
- **Layout:** left sidebar with full curriculum (module → lesson tree, current lesson highlighted, completed lessons ticked). Main pane shows current lesson content.
- **Video lessons:** custom player wrapper around HTML5 `<video>` (or plyr.io). Controls: play/pause, scrub, volume, playback speed (0.75x, 1x, 1.25x, 1.5x, 2x), captions toggle, fullscreen, picture-in-picture. Track playback position; auto-resume from last position.
- **Reading lessons:** rendered markdown/rich text.
- **Quiz lessons:** multiple-choice questions, immediate feedback, pass threshold (e.g. 70%) unlocks the next lesson.
- **Downloadable resources:** list of attachments below the video (PDFs, images, links).
- **Lesson footer:** "Mark as complete", "Previous", "Next" buttons.
- **Progress:** progress bar at top of sidebar (X of Y lessons complete). At 100%, unlock certificate.
- **Notes:** per-lesson notes panel (textarea, autosaves; "Add note at current time" for video lessons captures a timestamp).
- **Discussion/Q&A (optional v1, flag as build toggle):** per-lesson threaded comments; instructor and learners can reply.

### 3.8 Learner dashboard (`/dashboard`)
- **My Courses:** grid of enrolled courses with progress bar, "Continue" button that jumps to the last lesson watched.
- **Filters:** In progress / Completed / All.
- **Wishlist:** courses saved but not enrolled.
- **Certificates:** list of earned certificates with view/download buttons.
- **Account:** profile info, change password, notification preferences, delete account.
- **Purchase history:** enrollments with date, amount, payment method, invoice download (stub PDF).

### 3.9 Certificate (`/certificates/:id`)
- Full-page rendered certificate: learner name, course title, completion date, instructor signature (image), unique certificate ID, verification URL.
- "Download PDF" and "Share on LinkedIn" buttons.
- **Public verification page (`/verify/:certificate-id`):** anyone with the ID can confirm the certificate is valid.

### 3.10 Static pages
- `/about` — instructor bio, credentials, clinic info, mission.
- `/contact` — form (name, email, subject, message) → creates a contact submission → email stub to instructor. Include WhatsApp button, phone, email.
- `/terms`, `/privacy`, `/refund-policy` — placeholder legal copy the client will replace.
- `/faq` — accordion of common questions.

---

## 4. Admin back-office (`/admin`)

Separate login route or role-gated access from the main login. Distinct sidebar layout.

### 4.1 Dashboard (`/admin`)
- Total revenue (this month / all time)
- Total enrollments (this month / all time)
- Total students
- Total courses (published / draft)
- Revenue chart (line, last 12 months)
- Enrollments chart (bar, last 30 days)
- Recent enrollments (last 10)
- Recent signups (last 10)
- Top-performing courses (by revenue and by enrollments)

### 4.2 Courses (`/admin/courses`)
- Table: thumbnail, title, category, level, price, status (Draft/Published/Archived), enrollments, revenue, updated date, actions (Edit, Preview, Duplicate, Archive, Delete).
- Filter by status, category. Search by title.
- "New Course" button → course editor.

### 4.3 Course editor (`/admin/courses/:id/edit`)

**Basics tab:**
- Title, slug (auto from title, editable), subtitle, category, level, language, price (KES), sale price (optional + end date), free toggle.
- Short description (for cards, ~160 chars).
- Full description (rich text: TipTap or similar — headings, bold, italic, lists, links, images, code).
- What you'll learn (dynamic bullet list).
- Requirements (dynamic bullet list).
- Target audience (dynamic bullet list).

**Media tab:**
- Thumbnail upload (recommended 1280×720).
- Preview video upload or URL (mp4 / YouTube / Vimeo).

**Curriculum tab:**
- Modules list with drag-to-reorder. Each: title, optional description, add/remove.
- Lessons within a module, drag-to-reorder. Each: title, type (video/reading/quiz/resource), duration (auto for video, manual otherwise), content:
  - **Video:** upload or URL, captions upload (.vtt), transcript textarea.
  - **Reading:** rich text editor.
  - **Quiz:** questions — text, type (single/multi/true-false), options, correct answer(s), explanation.
  - **Resource:** file upload or external link with a label.
- "Free preview" toggle per lesson.

**Pricing tab:**
- Price, sale price, sale end date, free toggle, applicable coupons (multi-select).

**SEO tab:**
- Meta title, meta description, OG image (defaults to thumbnail).

**Settings tab:**
- Status (Draft/Published/Archived).
- Featured toggle.
- Enrollment cap (optional).
- Enrollment open/close dates (optional).
- Certificate template.

Persistent Save Draft / Publish buttons at the bottom. Preview button opens the public detail page with a draft banner.

### 4.4 Categories (`/admin/categories`)
- Table: name, slug, course count, actions.
- Create/edit modal: name, slug, description, icon (upload or icon picker), sort order.

### 4.5 Students (`/admin/students`)
- Table: avatar, name, email, signup date, enrolled courses count, last active, actions (view, message, suspend, delete).
- Search, filter by signup date range, filter by enrollment status.
- Student detail (`/admin/students/:id`): profile, enrollment list with progress, purchase history, admin-only notes, activity log.

### 4.6 Enrollments (`/admin/enrollments`)
- Table: student, course, enrollment date, progress %, completion date, payment method, amount, status.
- Filter by course, date range, payment method.
- Manual enrollment button (grant access without payment — comps/testing).
- Export CSV.

### 4.7 Payments (`/admin/payments`)
- Transaction list: date, student, course, amount, method (M-Pesa/Card/Free/Manual), status (success/failed/refunded), reference ID.
- Filter, export.
- Refund button (stub — updates status to refunded, revokes enrollment).

### 4.8 Coupons (`/admin/coupons`)
- Create coupons: code, discount type (% or fixed), value, applicable courses (all or specific), usage limit (total and per-user), validity dates, active toggle.
- Table with usage stats.

### 4.9 Reviews (`/admin/reviews`)
- Table: course, student, rating, review text, date, status (published/hidden/flagged).
- Moderation: hide, unhide, delete, reply (as instructor).

### 4.10 Contact submissions (`/admin/messages`)
- Table of contact form submissions. Mark as read/replied.

### 4.11 Notifications (`/admin/notifications`)
- Feed of stub system events: new signup, new enrollment, payment received, new review, contact submission, course completion.

### 4.12 Settings (`/admin/settings`)
- **General:** site name, tagline, logo, favicon, contact email, phone, address, social links.
- **Branding:** primary color, secondary color, font choice.
- **Payments (stub config):** M-Pesa shortcode, Consumer Key/Secret placeholders; Stripe publishable/secret key placeholders. Save is stubbed.
- **Email templates:** enrollment confirmation, welcome, password reset, certificate issued — editable subject and body with merge tags (`{{name}}`, `{{course}}`, etc.).
- **Legal pages:** rich text editors for Terms, Privacy, Refund Policy.
- **Certificate template:** upload background image, position learner name / course title / date / signature via a simple layout config.

### 4.13 Admin profile
- Update own name, email, password, profile photo, bio (feeds public instructor bio block).

---

## 5. Data model (relational)

PostgreSQL recommended; SQLite acceptable for local demo (build should be portable via ORM).

- **users** — id, name, email (unique), password_hash, role (`learner` | `admin`), avatar_url, bio, verified_at, created_at, updated_at.
- **categories** — id, name, slug (unique), description, icon_url, sort_order.
- **courses** — id, title, slug (unique), subtitle, description (rich text), short_description, category_id (fk), instructor_id (fk → users), level, language, price_kes, sale_price_kes, sale_ends_at, is_free, thumbnail_url, preview_video_url, status, is_featured, enrollment_cap, enrollment_opens_at, enrollment_closes_at, meta_title, meta_description, og_image_url, created_at, updated_at, published_at.
- **course_outcomes** — id, course_id, text, sort_order.
- **course_requirements** — id, course_id, text, sort_order.
- **course_audience** — id, course_id, text, sort_order.
- **modules** — id, course_id, title, description, sort_order.
- **lessons** — id, module_id, title, type (`video` | `reading` | `quiz` | `resource`), duration_seconds, content (jsonb — shape varies by type), is_free_preview, sort_order.
- **quiz_questions** — id, lesson_id, question, type (`single` | `multi` | `truefalse`), explanation, sort_order.
- **quiz_options** — id, question_id, text, is_correct, sort_order.
- **enrollments** — id, user_id, course_id, enrolled_at, completed_at, progress_percent, last_lesson_id, source (`purchase` | `free` | `manual` | `coupon`).
- **lesson_progress** — id, enrollment_id, lesson_id, completed, last_position_seconds, updated_at.
- **lesson_notes** — id, enrollment_id, lesson_id, content, video_timestamp_seconds (nullable), created_at, updated_at.
- **reviews** — id, user_id, course_id, rating (1–5), text, status, created_at.
- **payments** — id, user_id, course_id, enrollment_id (fk, nullable until success), amount_kes, method (`mpesa` | `card` | `free` | `manual`), status (`pending` | `success` | `failed` | `refunded`), reference (stub id), payload (jsonb), created_at.
- **coupons** — id, code (unique), discount_type (`percent` | `fixed`), discount_value, usage_limit, per_user_limit, starts_at, ends_at, is_active.
- **coupon_courses** — coupon_id, course_id (null = all courses).
- **coupon_usages** — id, coupon_id, user_id, payment_id, used_at.
- **wishlist** — user_id, course_id, added_at (composite PK).
- **certificates** — id (uuid, public), enrollment_id, issued_at, template_id.
- **contact_submissions** — id, name, email, subject, message, status, created_at.
- **subscribers** — id, email (unique), created_at.
- **notifications** — id, type, payload (jsonb), read_at, created_at (admin-scoped).
- **settings** — key (unique), value (jsonb) — site-wide config.

Indexes on all FKs, unique slugs, email fields. Soft-delete (`deleted_at`) on users, courses, and reviews.

---

## 6. Payment stubs

Two selectable methods on checkout. Both simulate real behavior without touching real gateways. All attempts create a `payments` row so admin views populate.

### 6.1 M-Pesa (Daraja STK Push simulation)
- User enters phone → clicks Pay.
- UI shows "Sending STK push to 2547XXXXXXXX…" (3s spinner), then "Enter your M-Pesa PIN on your phone…" (2s).
- Result rules:
  - Phone ending `0000` → failure: "Payment not confirmed. Try again."
  - Phone ending `1111` → pending indefinitely with a "Cancel" button.
  - Otherwise → success. Generate stub `MpesaReceiptNumber` = `MDEMO` + 8 random alphanumerics. Payment record: method=`mpesa`, status=`success`.

### 6.2 Card (Stripe-style simulation)
- User enters card fields → clicks Pay.
- UI shows "Processing payment…" (2s spinner).
- Result rules:
  - Card ending `0000` → failure: "Your card was declined."
  - Card ending `0002` → failure: "Insufficient funds."
  - Otherwise → success. Generate stub `charge_id` = `ch_demo_` + random. Payment record: method=`card`, status=`success`.
- Client-side validation: Luhn check on card number, expiry not in past, CVV 3–4 digits.

### 6.3 Currency
- Store prices in KES.
- USD toggle on course cards and checkout: display-only conversion using a hard-coded rate in settings (e.g. 1 USD = 129 KES). Actual "charge" is always KES.

---

## 7. Non-functional requirements

- **Responsive:** mobile-first, breakpoints at 640 / 768 / 1024 / 1280.
- **Accessibility:** WCAG 2.1 AA target. Semantic HTML, keyboard nav, focus rings, alt text, ARIA where needed, contrast checked.
- **Performance:** lazy-load images below the fold, code-split routes, cache static assets, target LCP < 2.5s on 4G.
- **SEO:** SSR marketing pages (catalog, detail, categories, about) with proper meta tags, Course schema.org structured data, sitemap.xml, robots.txt.
- **Security:** hashed passwords (bcrypt/argon2), CSRF protection, rate limiting on auth endpoints, input sanitization on rich text, signed URLs for private video assets.
- **Analytics:** stub (console log) layer with event names: `course_viewed`, `preview_played`, `enroll_clicked`, `checkout_started`, `payment_succeeded`, `payment_failed`, `lesson_started`, `lesson_completed`, `course_completed`, `certificate_issued`. Swappable for GA4/Plausible/PostHog.
- **Internationalization:** English only for v1; wrap user-facing strings in an i18n helper so Swahili can be added later.

---

## 8. Tech stack (recommended)

- **Framework:** Next.js 14+ (App Router) — SSR for public pages, client interactivity for dashboards.
- **Styling:** Tailwind CSS + shadcn/ui.
- **DB & ORM:** PostgreSQL + Prisma. SQLite for local demo is acceptable.
- **Auth:** NextAuth (Auth.js) — credentials + Google.
- **Rich text:** TipTap.
- **Video:** plyr.io or video.js. Storage stubbed to `/public/videos/` for demo; abstract behind a storage interface so Mux/Cloudflare Stream/Bunny can drop in.
- **File uploads:** local disk stub, same abstraction pattern (S3/R2-ready).
- **PDF (certificates, invoices):** react-pdf or pdf-lib server-side.
- **Charts:** Recharts.
- **Email:** stub adapter that writes to notifications + logs to console; interface accepts a real provider (Resend, Postmark) later.
- **Deployment:** Vercel or Node host; DB on Neon/Supabase/Railway.

Manus may substitute equivalents with reason — but preserve interface boundaries (auth, storage, payments, email) so real providers swap in without ripping the app apart.

---

## 9. Extensibility notes (design for, don't implement)

- **Multi-instructor:** `courses.instructor_id` already fk's to users; extend role enum to include `instructor` distinct from `admin`.
- **Subscriptions/memberships:** payments/enrollments can accommodate a `subscription` source; add a `plans` table later.
- **Live classes:** lesson `type` can extend to `live` with a scheduled datetime and Zoom/Meet URL.
- **CPD/CME accreditation:** certificate template supports custom fields; add `accreditation_body` and `cpd_points` to courses.
- **Mobile app:** keep API routes clean and REST/JSON-shaped so a React Native or Flutter client can consume them.

---

## 10. Seed data for demo

Ship the build with:
- 1 admin user (`admin@demo.co.ke` / password documented in README).
- 3 learner users at various progress states (0%, 40%, 100%).
- 6 categories: Endodontics, Restorative & Cosmetic, Pediatric Dentistry, Oral Surgery, Radiography & Imaging, Practice Management.
- 8 courses spanning categories and levels, at least 2 free and 2 with sale prices:
  1. *Endodontic Fundamentals: Diagnosis to Obturation* — Intermediate, KES 8,500
  2. *Composite Restorations: Anterior Aesthetics* — Intermediate, KES 6,000 (sale KES 4,500)
  3. *Pediatric Behavior Management in the Operatory* — Beginner, Free
  4. *Digital Radiography: Acquisition and Interpretation* — Beginner, KES 3,500
  5. *Implant Placement: Surgical Protocols and Case Selection* — Advanced, KES 15,000
  6. *Running a Modern Dental Practice* — All levels, KES 5,000
  7. *Local Anesthesia Techniques: A Refresher* — Beginner, Free
  8. *Aesthetic Smile Design Principles* — Advanced, KES 12,000 (sale KES 9,000)
- Each course: 4–6 modules, 3–8 lessons per module, 1–2 free preview lessons, at least one quiz.
- Placeholder video: a short public-domain clip or generated 10-second title-card mp4.
- 10–20 reviews spread across courses with varied ratings.
- 3 coupons: `WELCOME10` (10% off, all courses), `STUDENT500` (KES 500 off, specific courses), `EXPIRED` (past validity, to demo the failure state).

---

## 11. Acceptance criteria

The build is complete when:

1. A guest can land on the homepage, browse and filter courses, view a detail page, and watch a preview lesson without signing in.
2. A guest can sign up, verify email (stub), and log in.
3. A learner can enroll in a free course in one click and reach the learning view.
4. A learner can enroll in a paid course via both M-Pesa and Card stubs, including simulated failures using the trigger inputs in §6.
5. A learner can consume video, reading, and quiz lessons; progress persists across sessions; resume-from-last-position works.
6. Completing all lessons issues a certificate viewable and downloadable as PDF, with a public verification URL.
7. An admin can log in, create a course from scratch (basics → media → curriculum with modules and lessons including a quiz → pricing → publish), and the new course appears on the public site immediately.
8. An admin can view students, enrollments, payments, and analytics with charts populated by seed data.
9. An admin can create a coupon and a learner can successfully apply it at checkout.
10. All pages are responsive down to 360px width and pass basic keyboard-navigation and contrast checks.
11. All payment interactions and email/SMS notifications are stubs; no real gateway or provider is called.
12. Seed script populates the database so the app is immediately explorable after install.

---

## 12. Deliverable & README

Manus should produce:
- A complete codebase in a single repo.
- A `README.md` covering: setup, environment variables, database migration, seed command, dev server command, admin/learner demo credentials, deployment notes.
- A `.env.example` with all keys documented (stubbed values fine).
- A short walkthrough (video or annotated screenshots) demonstrating the 12 acceptance criteria.

End of specification.
