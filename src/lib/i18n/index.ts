import { en, type MessageKey } from "@/lib/i18n/en";

export type { MessageKey };

const catalogues: Record<string, Record<string, string>> = { en };

/** Active locale. English only for v1 (spec §12); wire next-intl/cookies here for Swahili. */
export const DEFAULT_LOCALE = "en";

/**
 * Translate a message key. `vars` replace `{name}` placeholders. Falls back to
 * English, then to the key itself, so a missing translation never crashes UI.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>, locale = DEFAULT_LOCALE): string {
  const template = catalogues[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
