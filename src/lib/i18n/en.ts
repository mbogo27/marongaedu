/**
 * English message catalogue (spec §12 i18n). Add `sw.ts` with the same keys to
 * ship Swahili; `t()` in ./index.ts picks the catalogue for the active locale.
 * Placeholders use {name} syntax.
 */
export const en = {
  // --- auth ---
  "auth.generic_error": "Something went wrong. Please try again.",
  "auth.invalid_credentials": "Incorrect email or password.",
  "auth.account_unavailable": "This account is unavailable — contact support.",
  "auth.too_many_attempts": "Too many attempts. Please try again in {wait}.",
  "auth.signup_rate_limited": "Too many sign-up attempts from this network. Please try again in {wait}.",
  "auth.name_min": "Name must be at least 2 characters.",
  "auth.email_invalid": "Enter a valid email address.",
  "auth.password_min": "Use at least {min} characters.",
  "auth.password_max": "Use at most 128 characters.",
  "auth.password_common": "That password is too common. Choose something harder to guess.",
  "auth.password_mismatch": "Passwords do not match.",
  "auth.terms_required": "You must accept the Terms and Privacy Policy.",
  "auth.password_required": "Password is required.",
  "auth.reset_invalid": "This reset link is invalid or has expired.",
  "auth.reset_sent": "If an account exists for that email, we've sent a reset link.",
  "auth.verify_rate_limited": "You can request at most 3 verification emails per hour. Try again in {wait}.",
  "auth.verify_sent": "Verification email sent. Check your inbox.",
  "auth.captcha_failed": "Bot check failed. Please try again.",
  "auth.current_password_wrong": "Current password is incorrect.",
  "auth.email_in_use": "That email address can't be used.",
  "auth.delete_confirm_mismatch": "Type DELETE to confirm.",
  "auth.last_admin": "At least one active admin must remain.",
  "auth.cannot_self": "You can't do that to your own account.",

  // --- account ---
  "account.saved": "Saved.",
  "account.password_changed": "Password updated. Other devices were signed out.",
  "account.email_change_sent": "We sent a confirmation link to {email}. Your email changes once you confirm it.",
  "account.sessions_revoked": "Signed out of your other sessions.",

  // --- enrollment / checkout ---
  "enroll.sold_out": "This course is sold out.",
  "enroll.closed": "Enrollment for this course is closed.",
  "enroll.not_open": "Enrollment for this course hasn't opened yet.",
  "enroll.already": "You're already enrolled in this course.",
  "checkout.course_not_found": "Course not found.",
  "checkout.invalid_phone": "Enter a valid M-Pesa number in the format 2547XXXXXXXX.",
  "checkout.invalid_card": "Enter a valid card number.",
  "checkout.invalid_expiry": "Card expiry is invalid or in the past.",
  "checkout.invalid_cvv": "CVV must be 3 or 4 digits.",
  "checkout.coupon_not_found": "Coupon not found or inactive.",
  "checkout.coupon_not_started": "This coupon isn't active yet.",
  "checkout.coupon_expired": "This coupon has expired.",
  "checkout.coupon_wrong_course": "This coupon doesn't apply to this course.",
  "checkout.coupon_exhausted": "This coupon has reached its usage limit.",
  "checkout.coupon_used": "You've already used this coupon.",
  "checkout.demo_banner": "This is a demo — no real payment is processed.",

  // --- learning ---
  "learn.locked_sequential": "Complete the previous lesson to unlock this one.",
  "learn.not_enrolled": "You're not enrolled in this course.",
  "learn.quiz_passed": "Passed! Great work.",
  "learn.quiz_failed": "Not quite — review the explanations and try again.",

  // --- reviews ---
  "review.verify_first": "Verify your email to write a review.",
  "review.enroll_first": "You must be enrolled to review this course.",
  "review.progress_required": "Complete at least {percent}% of the course before reviewing.",
  "review.invalid": "Please provide a rating and a short review.",

  // --- generic ---
  "common.not_found": "Not found.",
  "common.forbidden": "You don't have permission to do that.",
  "common.saved": "Saved.",
} as const;

export type MessageKey = keyof typeof en;
