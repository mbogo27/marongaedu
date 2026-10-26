import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type LimitState = {
  /** Hits recorded in the current window (after this call, for `consume`). */
  count: number;
  /** True when count has exceeded `limit`. */
  blocked: boolean;
  retryAfterSec: number;
};

/**
 * Fixed-window limiter behind an interface (spec §3.7). `consume` records a
 * hit; `peek` only reads (used for "N *failed* attempts" rules where we count
 * failures but must check before attempting); `reset` clears a key.
 */
export interface RateLimiter {
  consume(key: string, limit: number, windowSec: number): Promise<LimitState>;
  peek(key: string, limit: number, windowSec: number): Promise<LimitState>;
  reset(key: string): Promise<void>;
}

// ---- Postgres (default; shared across instances) ----

export class DbRateLimiter implements RateLimiter {
  async consume(key: string, limit: number, windowSec: number): Promise<LimitState> {
    const rows = await db.$queryRaw<{ count: number; elapsed: number }[]>(Prisma.sql`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                       THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                             THEN now() ELSE "RateLimit"."windowStart" END
      RETURNING "count", EXTRACT(EPOCH FROM (now() - "windowStart"))::float AS elapsed
    `);
    const { count, elapsed } = rows[0];
    return this.state(count, elapsed, limit, windowSec);
  }

  async peek(key: string, limit: number, windowSec: number): Promise<LimitState> {
    const rows = await db.$queryRaw<{ count: number; elapsed: number }[]>(Prisma.sql`
      SELECT "count", EXTRACT(EPOCH FROM (now() - "windowStart"))::float AS elapsed
      FROM "RateLimit" WHERE "key" = ${key}
    `);
    if (!rows[0] || rows[0].elapsed >= windowSec) return { count: 0, blocked: false, retryAfterSec: 0 };
    return this.state(rows[0].count, rows[0].elapsed, limit, windowSec);
  }

  async reset(key: string) {
    await db.rateLimit.deleteMany({ where: { key } });
  }

  private state(count: number, elapsed: number, limit: number, windowSec: number): LimitState {
    const blocked = count > limit;
    return { count, blocked, retryAfterSec: blocked ? Math.max(1, Math.ceil(windowSec - elapsed)) : 0 };
  }
}

// ---- In-memory (dev/tests only; env.ts forbids it in production) ----

class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; start: number }>();

  private current(key: string, windowSec: number) {
    const now = Date.now();
    const e = this.store.get(key);
    if (!e || now - e.start >= windowSec * 1000) return undefined;
    return e;
  }
  private state(count: number, start: number, limit: number, windowSec: number): LimitState {
    const blocked = count > limit;
    return { count, blocked, retryAfterSec: blocked ? Math.max(1, Math.ceil(windowSec - (Date.now() - start) / 1000)) : 0 };
  }
  async consume(key: string, limit: number, windowSec: number) {
    const e = this.current(key, windowSec) ?? { count: 0, start: Date.now() };
    e.count += 1;
    this.store.set(key, e);
    return this.state(e.count, e.start, limit, windowSec);
  }
  async peek(key: string, limit: number, windowSec: number) {
    const e = this.current(key, windowSec);
    return e ? this.state(e.count, e.start, limit, windowSec) : { count: 0, blocked: false, retryAfterSec: 0 };
  }
  async reset(key: string) {
    this.store.delete(key);
  }
}

// ---- Upstash Redis (REST) ----

class UpstashRateLimiter implements RateLimiter {
  private async cmd<T>(commands: (string | number)[][]): Promise<T[]> {
    const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash rate limiter error: ${res.status}`);
    const data = (await res.json()) as { result: T }[];
    return data.map((d) => d.result);
  }
  private state(count: number, ttlMs: number, limit: number): LimitState {
    const blocked = count > limit;
    return { count, blocked, retryAfterSec: blocked ? Math.max(1, Math.ceil(ttlMs / 1000)) : 0 };
  }
  async consume(key: string, limit: number, windowSec: number) {
    const k = `rl:${key}`;
    const [count, , ttl] = await this.cmd<number>([["INCR", k], ["EXPIRE", k, windowSec, "NX"], ["PTTL", k]]);
    return this.state(count, ttl, limit);
  }
  async peek(key: string, limit: number) {
    const k = `rl:${key}`;
    const [count, ttl] = await this.cmd<number | string | null>([["GET", k], ["PTTL", k]]);
    return this.state(Number(count ?? 0), Number(ttl ?? 0), limit);
  }
  async reset(key: string) {
    await this.cmd([["DEL", `rl:${key}`]]);
  }
}

let instance: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (!instance) {
    switch (env.RATE_LIMIT_PROVIDER) {
      case "memory":
        instance = new MemoryRateLimiter();
        break;
      case "upstash":
        instance = new UpstashRateLimiter();
        break;
      default:
        instance = new DbRateLimiter();
    }
  }
  return instance;
}

/** Test seam. */
export function setRateLimiter(l: RateLimiter | undefined) {
  instance = l;
}

export function formatRetry(sec: number): string {
  const m = Math.ceil(sec / 60);
  return m <= 1 ? "a minute" : `${m} minutes`;
}
