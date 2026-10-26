# Client walkthrough

A script for demonstrating every acceptance criterion in `SPEC-v2-full-lms.md` §15. Start fresh with `npm run db:reset`, then `npm run dev` (http://localhost:3000). Console emails appear in **Admin → Notifications** (expand "Show message") and in the terminal; with `EMAIL_PROVIDER=resend` they arrive in the real inbox.

Each step lists the automated test that covers it (`tests/e2e/…`, `tests/integration/…`) so a failing demo step can be reproduced in CI.

Password for all seeded accounts: `Demo@1234`.

## 1. Browse without an account (AC 1) — `01-catalog`

1. Open `/`. Scroll: featured courses, categories, instructor, testimonials.
2. `/courses`: search "endodontic" (matches title) and "apex locators" (matches a *lesson title*); tick **Free**; sort by price; switch **KES / USD** (display only).
3. Open *Endodontic Fundamentals*: **Expand all**, press **Preview** on a lesson marked "Free preview" (modal player, seekable), and play the intro video. No sign-in needed.

## 2. Sign up + verify by email (AC 2) — `02-auth`

1. `/signup`: watch the strength meter; try `1234567890` (rejected as common) and a short password.
2. Sign up with a fresh email → **Check your inbox** page. In Admin → Notifications (or the terminal) open the "Verify your email" message and follow the link → **Email verified**; the link works once.
3. Sign up again with the *same* address: identical "Check your inbox" screen (nothing revealed), but the real owner receives "Someone tried to sign up".

## 3. Sign in, remember me, sessions (AC 3) — `02-auth`

1. Log in with and without **Remember me** (session cookie vs 30-day cookie; httpOnly, SameSite=Lax).
2. Log in from a second browser, open **Account → Active sessions** in the first and click **Sign out of all other sessions**; the second browser is signed out on its next request.

## 4. Forgot / reset password (AC 4) — `02-auth`

`/forgot-password` → link in the email → set a new password → every session is revoked, the old password fails, a "password changed" email is sent. Reopen the link: "already been used". Request more than 3 resets per hour: rate limited.

## 5. Free enrollment (AC 5) — `03-learning`

Log in as `learner0@demo.co.ke`, open *Pediatric Behavior Management* → **Enroll free** → straight into `/learn/…`.

## 6. Content is really protected (AC 6) — `01-catalog`, `03-learning`, `commerce.test`

While logged out, open a paid lesson's `/api/lessons/<id>` (401) and a private media URL without its signature (403). Log in as a learner who is *not* enrolled: same refusal (403), `/learn/<slug>` bounces to the course page. After an admin refund the learner loses access immediately.

## 7. Learning experience (AC 7) — `03-learning`

As `learner40@demo.co.ke` (40%): the sidebar shows progress; play a video (speed 0.75–2×, captions, PiP, fullscreen; shortcuts `space/k`, `j/l`, `m`, `c`, `f`), pause, reload: it resumes. Videos auto-complete at 90%. Take notes (autosave, "Add note at current time" → click the timestamp to seek; **My notes** lists them all). Take the quiz: wrong answers fail and show explanations only after grading; the page source never contains the answers. Open *Running a Modern Dental Practice* (sequential) to see locked lessons.

## 8. Buying with M-Pesa and card (AC 8) — `04-checkout`

Log in as a new learner, open a paid course → **Enroll now**.
- M-Pesa `254712345678`: "Sending STK push…", "Enter your PIN…", then success and enrollment (not before). `…0000` fails, `…1111` stays pending with **Cancel**.
- Card `4242 4242 4242 4242` succeeds; `4242 4200 0000 0000` declined; `4242 4200 0008 0002` insufficient funds.
- Double-click **Pay**: exactly one charge. Download the invoice from **Account → Purchase history**.

## 9. Coupons (AC 9) — `04-checkout`, `05-admin`

Apply `WELCOME10`; try `EXPIRED`, `STUDENT500` on a course it does not cover. In **Admin → Coupons** create one and use it at checkout. Prices come from the server, never from the browser.

## 10. Create and publish a course (AC 10) — `05-admin`

Admin → **Courses → New course**: basics (autosave shows "Saved"), **Media** (upload a thumbnail; progress bar, direct to storage), **Curriculum** (module, video lesson with an upload (duration auto-detected), reading, quiz with 4 question types, drag handles), **Pricing**, then the checklist turns green and **Publish** goes live on `/courses` immediately; **Unpublish** hides it. Rename the slug and open the old URL: it redirects. Leave with unsaved edits: the browser asks first.

## 11. Admin invitation and 404s (AC 11) — `05-admin`

**Settings → Team → Invite by email** → follow the link in the invitee's mail → set name + password → they land in `/admin`. Logged out (or as a learner) request `/admin`: **404**.

## 12. Refund (AC 12) — `05-admin`, `commerce.test`

**Admin → Payments → Refund** on a card payment: status *Refunded*, enrollment revoked, learner emailed, audit-logged. The learner can no longer open the course; re-buying restores their progress.

## 13. Certificate (AC 13) — `03-learning`, `learning.test`

Finish a short course (or use `learner100@demo.co.ke`): certificate issued automatically (check the email). **Certificates** tab → view, **Download PDF** (needs a verified email), share to LinkedIn, scan the QR / open `/verify/<code>` while logged out. Revoke the enrollment: the public page says **revoked**.

## 14. Rate limiting + audit log (AC 14) — `02-auth`

Five wrong passwords for one email → "Too many attempts". **Admin → Audit log** → filter `auth.` to see `login_failed` / `login_blocked`.

## 15. Google later (AC 15)

README → "Enabling Google sign-in": one flag plus the OAuth callback. Note **Account → Password** reads "Set a password" for accounts that have none.

## 16. Responsive + accessible (AC 16) — `06-accessibility`

Resize to 360 px: filters become a drawer, the enroll bar sticks, the learning sidebar is a drawer, admin tables scroll inside their container. Tab through any page: skip link, visible focus. The suite runs axe on the key pages and fails on serious/critical issues.

## 17. Seed is explorable (AC 17)

`npm run db:seed`: 6 categories, 8 courses (2 free, 2 on sale), 20 users incl. an unverified one and learners at 0 / 40 / 100 %, a certificate, payments including one refunded, one failed and one cancelled, reviews with votes, 3 coupons, FAQs.

## 18. CI (AC 18)

`npm run ci` locally (typecheck, lint, tests, build) and `npm run test:e2e`; GitHub Actions runs the same.
