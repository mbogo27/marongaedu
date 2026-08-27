"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, googleStubAction, type AuthFormState } from "@/lib/actions/auth";
import { passwordStrength } from "@/lib/validation";
import { GoogleIcon } from "./LoginForm";

const STRENGTH_COLORS = ["bg-red-400", "bg-red-400", "bg-gold-500", "bg-gold-500", "bg-teal-500", "bg-teal-600"];

export default function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupAction, undefined);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);

  return (
    <div className="w-full max-w-md rounded-2xl border border-teal-100 bg-white p-8 shadow-sm">
      <h1 className="font-serif text-2xl text-teal-900">Create your account</h1>
      <p className="mt-1 text-sm text-ink/60">Join Maronga Dental Academy to start learning.</p>

      <form action={googleStubAction}>
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-teal-100 px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-teal-50"
        >
          <GoogleIcon />
          Sign up with Google
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/40">
        <span className="h-px flex-1 bg-teal-100" />
        or
        <span className="h-px flex-1 bg-teal-100" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink/70">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          {state?.fieldErrors?.name && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink/70">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          {state?.fieldErrors?.email && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-ink/70">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          {password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-full flex-1 rounded-full ${i < strength.score ? STRENGTH_COLORS[strength.score] : "bg-ink/10"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-ink/50">{strength.label}</span>
            </div>
          )}
          {state?.fieldErrors?.password && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password[0]}</p>}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-ink/70">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          {state?.fieldErrors?.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.confirmPassword[0]}</p>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-ink/70">
          <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-600" />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-teal-700 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-teal-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
