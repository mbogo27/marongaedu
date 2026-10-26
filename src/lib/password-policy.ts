/**
 * Client-safe password rules (spec §3.2): min 10 characters, no forced
 * symbol rules. The common-password check lives server-side
 * (src/lib/auth/password.ts) so the 10k list never ships to the browser.
 */
export const PASSWORD_MIN_LENGTH = 10;

const WEAK_PATTERNS = [/^(.)\1+$/, /^(0123456789|1234567890|abcdefghij|qwertyuiop|asdfghjkl)/i];

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/**
 * Cheap entropy-style estimate for the strength meter (zxcvbn-equivalent in
 * spirit: rewards length and variety, punishes repeats and keyboard runs).
 */
export function passwordStrength(password: string): PasswordStrength {
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
  if (!password) return { score: 0, label: labels[0] };
  if (WEAK_PATTERNS.some((p) => p.test(password))) return { score: 0, label: labels[0] };

  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
  const unique = new Set(password).size;
  const bits = Math.log2(Math.max(pool, 2)) * Math.min(password.length, unique * 2);

  const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 55 ? 2 : bits < 70 ? 3 : 4;
  return { score: score as PasswordStrength["score"], label: labels[score] };
}
