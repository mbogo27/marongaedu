import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "mt-1 w-full rounded-lg border border-teal-200 bg-white px-4 py-2.5 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 aria-[invalid=true]:border-red-500";

export const primaryButtonClass =
  "rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

/** Labelled input with an accessible error message (aria-invalid + aria-describedby). */
export function Field({ label, error, hint, id, name, className, ...rest }: FieldProps) {
  const fieldId = id ?? name ?? label;
  const errId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink/80">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={className ?? inputClass}
        {...rest}
      />
      {hint && (
        <div id={hintId} className="mt-1 text-xs text-ink/60">
          {hint}
        </div>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
        {message}
      </p>
    );
  }
  return null;
}
