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
  function update(i: number, value: string) {
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, ""]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink/70">{label}</label>
        <button type="button" onClick={add} className="text-xs font-medium text-teal-700 hover:underline">
          + Add
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-teal-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
            />
            <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-red-500 hover:bg-red-50">
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-ink/40">Nothing added yet.</p>}
      </div>
    </div>
  );
}
