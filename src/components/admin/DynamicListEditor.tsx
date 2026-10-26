"use client";

export default function DynamicListEditor({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const update = (i: number, value: string) => onChange(items.map((it, idx) => (idx === i ? value : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <fieldset>
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium text-ink/80">{label}</legend>
        <button type="button" onClick={add} className="text-xs font-semibold text-teal-800 underline underline-offset-2">
          + Add<span className="sr-only"> to {label}</span>
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              aria-label={`${label} ${i + 1}`}
              maxLength={300}
              className="flex-1 rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-50">
              Remove<span className="sr-only"> {label} {i + 1}</span>
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-ink/70">Nothing added yet.</p>}
      </div>
    </fieldset>
  );
}
