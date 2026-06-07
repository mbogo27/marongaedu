import type { Level } from "@/lib/types";

const styles: Record<Level, string> = {
  Beginner: "bg-teal-50 text-teal-700",
  Intermediate: "bg-gold-300/40 text-gold-600",
  Advanced: "bg-teal-900/10 text-teal-900",
  "All levels": "bg-ink/5 text-ink/70",
};

export default function LevelBadge({ level }: { level: Level }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[level]}`}
    >
      {level}
    </span>
  );
}
