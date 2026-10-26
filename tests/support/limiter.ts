import { getRateLimiter, setRateLimiter, type RateLimiter } from "@/lib/rate-limit";

/** The memory limiter, obtained through the public factory (RATE_LIMIT_PROVIDER=memory in tests). */
export class MemoryLimiterForTests implements RateLimiter {
  private inner: RateLimiter;
  constructor() {
    setRateLimiter(undefined);
    this.inner = getRateLimiter();
  }
  consume = (k: string, l: number, w: number) => this.inner.consume(k, l, w);
  peek = (k: string, l: number, w: number) => this.inner.peek(k, l, w);
  reset = (k: string) => this.inner.reset(k);
}
