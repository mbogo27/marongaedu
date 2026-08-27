import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "At least 8 characters.")
    .regex(/[a-zA-Z]/, "At least one letter.")
    .regex(/[0-9]/, "At least one number."),
  confirmPassword: z.string(),
  terms: z.literal("on", { message: "You must accept the terms." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  subject: z.string().trim().min(2, "Subject is required."),
  message: z.string().trim().min(10, "Message must be at least 10 characters."),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Review must be at least 10 characters."),
});

export function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
  return { score, label: labels[score] ?? labels[0] };
}
