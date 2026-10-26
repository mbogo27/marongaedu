import { z } from "zod";

/**
 * Zod-validated environment (spec §17). Parsed lazily on first access and
 * eagerly at boot from `instrumentation.ts`, so a misconfigured deployment
 * fails fast with a readable message instead of a cryptic runtime error.
 *
 * Empty strings are treated as "unset" so `.env` files can list every key.
 */
const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required (postgresql://user:pass@host:5432/db)"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters (openssl rand -base64 32)"),
    AUTH_GOOGLE_ENABLED: bool,
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Maronga Dental Academy <no-reply@example.com>"),
    ADMIN_NOTIFY_EMAIL: z.string().email().optional(),

    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default(".storage"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_PUBLIC: z.string().optional(),
    S3_BUCKET_PRIVATE: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),

    MAX_VIDEO_MB: z.coerce.number().int().positive().default(2048),
    MAX_FILE_MB: z.coerce.number().int().positive().default(50),

    PAYMENTS_MODE: z.enum(["simulated"]).default("simulated"),

    RATE_LIMIT_PROVIDER: z.enum(["memory", "db", "upstash"]).default("db"),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    TURNSTILE_ENABLED: bool,
    TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),

    ANALYTICS_PROVIDER: z.enum(["console", "posthog", "plausible", "ga4"]).default("console"),
    FEATURE_DISCUSSIONS: bool,
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    const need = (cond: boolean, keys: string[], why: string) => {
      if (!cond) return;
      for (const k of keys) {
        if (!(e as Record<string, unknown>)[k]) {
          ctx.addIssue({ code: "custom", path: [k], message: `${k} is required when ${why}` });
        }
      }
    };
    need(e.EMAIL_PROVIDER === "resend", ["RESEND_API_KEY"], "EMAIL_PROVIDER=resend");
    need(
      e.STORAGE_PROVIDER === "s3",
      ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET_PUBLIC", "S3_BUCKET_PRIVATE", "S3_PUBLIC_BASE_URL"],
      "STORAGE_PROVIDER=s3"
    );
    need(
      e.RATE_LIMIT_PROVIDER === "upstash",
      ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
      "RATE_LIMIT_PROVIDER=upstash"
    );
    need(e.TURNSTILE_ENABLED, ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"], "TURNSTILE_ENABLED=true");
    need(e.AUTH_GOOGLE_ENABLED, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "AUTH_GOOGLE_ENABLED=true");
    if (e.NODE_ENV === "production") {
      if (e.RATE_LIMIT_PROVIDER === "memory") {
        ctx.addIssue({
          code: "custom",
          path: ["RATE_LIMIT_PROVIDER"],
          message: "RATE_LIMIT_PROVIDER=memory is dev-only (not shared across instances); use db or upstash",
        });
      }
      if (e.AUTH_SECRET.length < 32) {
        ctx.addIssue({ code: "custom", path: ["AUTH_SECRET"], message: "AUTH_SECRET must be at least 32 characters in production" });
      }
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const cleaned: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(source)) cleaned[k] = v === "" ? undefined : v;
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}\nSee .env.example.`);
  }
  return result.data;
}

export function getEnv(): Env {
  cached ??= parseEnv();
  return cached;
}

/** Convenience accessor: `env.APP_URL`. Validates on first property read. */
export const env = new Proxy({} as Env, {
  get: (_t, prop: string) => getEnv()[prop as keyof Env],
});
