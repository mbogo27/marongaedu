import type { ReactNode } from "react";

export function SettingsCard({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={`${id ?? title}-h`} className="rounded-2xl border border-teal-100 bg-white p-6">
      <h2 id={`${id ?? title}-h`} className="font-serif text-lg text-teal-900">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SField({
  label,
  name,
  defaultValue,
  type = "text",
  className,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  className?: string;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "defaultValue">) {
  const id = `s-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink/80">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        {...rest}
        className={`mt-1 w-full rounded-lg border border-teal-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${type === "color" ? "h-11 p-1" : ""}`}
      />
      {hint && <p className="mt-1 text-xs text-ink/70">{hint}</p>}
    </div>
  );
}

export function SaveButton({ label = "Save" }: { label?: string }) {
  return (
    <div className="sm:col-span-2">
      <button type="submit" className="rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800">
        {label}
      </button>
    </div>
  );
}
