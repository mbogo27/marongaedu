# Dental E-Learning Platform — Demo Spec

**Status:** Draft v0.1 — taster/demo scope
**Client:** Dentist-educator (name TBD)
**Purpose:** Give the client a tangible feel for how the platform will look and operate. Not production. Stubs are fine where the experience can still be communicated.

---

## 1. Intent

The client sells dental courses to students and practitioners who want authoritative training in the field. This build is a **walkthrough artifact** — something the client can click through and imagine their business inside. It is not yet a working LMS.

Two audiences to demo:
- **Learner** (front of house) — discovers, previews, enrolls, learns.
- **Instructor/Admin** (back of house) — uploads courses, sees enrollments, manages content.

Including both makes the demo significantly more persuasive at the sales stage — the client sees the whole picture, not just the storefront. Recommended even though it adds modest scope (see §5).

---

## 2. Learner-facing pages

### 2.1 Homepage
- Hero: clinic/instructor positioning, one-line value prop ("Authoritative dental education from a practicing clinician"), CTA to browse courses.
- **Course grid** — cards showing thumbnail, title, short blurb, level (Beginner / Intermediate / Advanced), duration, price. 6–9 stub courses is enough to feel real.
- Suggested categories so the client sees the editorial shape: *Endodontics, Restorative & Cosmetic, Pediatric Dentistry, Oral Surgery Fundamentals, Practice Management, Radiography & Imaging, Periodontics, Implantology, Dental Materials*. Pick ~6 for the demo.
- Footer: about, contact, social, simple newsletter stub.

### 2.2 Course detail page
- Header: title, instructor byline, level, duration, price, "Enroll" CTA.
- **Preview video player** — embedded (placeholder mp4 or Vimeo/YouTube stub). Plays in-page. This is the "wow" moment for the client; make it feel polished.
- Short course description (2–3 paragraphs).
- **Curriculum outline** — collapsible. Default view shows module titles only; clicking expands to show lessons within each module. Each lesson shows duration and a lock/preview icon (one or two lessons marked "Free preview").
- "What you'll learn" bullet list (4–6 outcomes).
- Instructor bio block.
- Reviews/testimonials section (stubbed with 2–3 entries).
- Enroll CTA repeated at bottom.

### 2.3 Sign up / Log in (stubbed)
- Modal or dedicated page. Email + password fields, "Sign in with Google" button.
- On submit: no real auth. Either accept anything and route to a stub dashboard, or show a "Coming soon — this is a demo" toast. The former feels more complete.

### 2.4 Enroll (stubbed)
- Click "Enroll" → modal showing order summary (course, price) → "Pay" button → success state ("You're enrolled! Start learning →").
- Routes to a stub learner dashboard showing the enrolled course and a "Continue learning" tile. No real payment integration.

### 2.5 Learner dashboard (light stub)
- "My Courses" — cards for enrolled course(s), progress bar (fake %), continue button.
- Profile section (name, email — display only).

---

## 3. Instructor/Admin back-office (recommended for the demo)

The client should *see themselves logging in*. Even a thin admin shell anchors the sale: "this is where you'd add a new course on Monday morning."

Suggested screens, all stubbed:
- **Admin login** — same auth pattern, separate route (`/admin`).
- **Dashboard** — tiles: total courses, total enrollments, revenue (mock numbers), recent signups list.
- **Courses list** — table with title, status (Draft/Published), enrollments, price, edit button.
- **Course editor** — form fields for title, description, price, level, thumbnail upload, then a curriculum builder (add module → add lessons under it, drag-to-reorder if cheap to ship, otherwise just add/remove). Save button shows a toast; doesn't have to persist beyond local state for the demo.
- **Students list** — table of enrolled learners (mock data).

If scope pressure hits, the editor is the one to keep — it answers the unspoken client question "how hard is it for me to put a course up?"

---

## 4. Content for the demo

Use real, authoritative-sounding dental topics so the client recognizes their world. Suggested stub courses:

1. *Endodontic Fundamentals: Diagnosis to Obturation* — Intermediate, 6h
2. *Composite Restorations: Anterior Aesthetics* — Intermediate, 4h
3. *Pediatric Behavior Management in the Operatory* — Beginner, 3h
4. *Digital Radiography: Acquisition and Interpretation* — Beginner, 2.5h
5. *Implant Placement: Surgical Protocols and Case Selection* — Advanced, 8h
6. *Running a Modern Dental Practice* — All levels, 5h

The client should be invited to swap these for their actual planned curriculum before the next iteration.

---

## 5. Out of scope (for this demo)

- Real authentication, accounts, sessions.
- Real payments (Stripe/M-Pesa wiring).
- Video hosting/streaming infrastructure (use placeholder embeds).
- Email notifications, certificates, quizzes, assignments.
- Discussion forums, live classes, scheduling.
- Mobile apps. (Web responsive only.)

These are the natural Phase 2 conversation once the client signs off on the feel.

---

## 6. Tech notes

- Static-ish single-page experience is fine. Next.js or plain HTML/CSS/JS both work for a taster.
- Mock data in a JSON file or hardcoded module.
- Curriculum collapse via `<details>` element or a tiny JS toggle — no framework required.
- Polish over features. The client is buying a *feeling*, not a feature list.

---

## 7. Open questions for the client

1. Brand assets — logo, colors, photography? Or should we propose a direction?
2. Pricing model — flat per-course, bundles, subscription, or a mix?
3. Target market — Kenya only, East Africa, global English-speaking? Affects pricing display (KES vs USD) and payment options downstream.
4. Certification — does completing a course issue a certificate? (Not in demo, but worth knowing for Phase 2.)
5. CPD/CME accreditation — is the client positioning this as continuing professional development? That changes the marketing copy substantially.
6. Instructor model — solo instructor (just the client), or does he plan to invite guest lecturers later?

---

## 8. Deliverable

A clickable web demo deployed to a shareable URL. The client should be able to:
- Land on the homepage and browse courses.
- Open a course, play the preview video, expand the curriculum.
- Click Enroll and reach the success state.
- Log in as admin and see the editor screen.

Sign-off on this spec → build → walkthrough call → iterate.
