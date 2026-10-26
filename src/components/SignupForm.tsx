"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "@/lib/actions/auth";
import { passwordStrength, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { Field, FormMessage, primaryButtonClass } from "@/components/ui/Field";

const STRENGTH_COLORS = ["bg-red-500", "bg-red-500", "bg-gold-500", "bg-teal-500", "bg-teal-700"];

export default function SignupForm({
  redirectTo,
  socialSlot,
  captchaSlot,
}: {
  redirectTo?: string;
  socialSlot?: ReactNode;
  captchaSlot?: ReactNode;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupAction, undefined);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Create your account</h1>
      <p className="mt-1 text-sm text-ink/70">Join to start learning.</p>

      {socialSlot}

      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <Field label="Full name" name="name" autoComplete="name" required error={state?.fieldErrors?.name?.[0]} />
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state?.fieldErrors?.email?.[0]}
        />
        <div>
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={state?.fieldErrors?.password?.[0]}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short phrase works well.`}
          />
          {password && (
            <div className="mt-2 flex items-center gap-2" role="status" aria-live="polite">
              <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-full flex-1 rounded-full ${i < Math.max(1, strength.score) ? STRENGTH_COLORS[strength.score] : "bg-ink/10"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-ink/70">Strength: {strength.label}</span>
            </div>
          )}
        </div>
        <Field
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword?.[0]}
        />
        <div>
          <label className="flex items-start gap-2 text-sm text-ink/80">
            <input
              type="checkbox"
              name="terms"
              required
              aria-invalid={state?.fieldErrors?.terms ? true : undefined}
              className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-700"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" rel="noopener" className="text-teal-800 underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener" className="text-teal-800 underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {state?.fieldErrors?.terms && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {state.fieldErrors.terms[0]}
            </p>
          )}
        </div>
        {captchaSlot}
        <FormMessage error={state?.error} />
        <button type="submit" disabled={pending} className={`mt-1 ${primaryButtonClass}`}>
          {pending ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-800 underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
