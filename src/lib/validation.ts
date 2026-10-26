import { z } from "zod";
import { t } from "@/lib/i18n";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export { passwordStrength, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

/** Trim + lowercase (spec §3.2). Used everywhere an email enters the system. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email(t("auth.email_invalid")).max(254));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, t("auth.password_min", { min: PASSWORD_MIN_LENGTH }))
  .max(128, t("auth.password_max"));

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, t("auth.name_min")).max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.literal("on", { message: t("auth.terms_required") }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t("auth.password_mismatch"),
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, t("auth.password_required")),
});

export const resetPasswordSchema = z
  .object({ token: z.string().min(10), password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: t("auth.password_mismatch"),
    path: ["confirmPassword"],
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(100),
  email: emailSchema,
  subject: z.string().trim().min(2, "Subject is required.").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Review must be at least 10 characters.").max(3000),
});

/** First message per field, for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
