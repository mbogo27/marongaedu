import { levelLabel } from "@/lib/content-types";

const styles: Record<string, string> = {
  BEGINNER: "bg-teal-50 text-teal-900",
  INTERMEDIATE: "bg-gold-100 text-gold-900",
  ADVANCED: "bg-teal-900 text-white",
  ALL_LEVELS: "bg-ink/5 text-ink/80",
};

export default function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[level] ?? styles.ALL_LEVELS}`}>
      {levelLabel(level)}
    </span>
  );
}
