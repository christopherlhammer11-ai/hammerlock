/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window approach with per-IP tracking.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });
 *   // In your route handler:
 *   const limited = limiter.check(ip);
 *   if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimiterOptions = {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
  /** Max requests per window per IP (default: 30) */
  maxRequests?: number;
};

export function createRateLimiter(opts: RateLimiterOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const maxRequests = opts.maxRequests ?? 30;
  const store = new Map<string, RateLimitEntry>();

  // Cleanup stale entries every 5 minutes to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  };
  setInterval(cleanup, 5 * 60_000).unref?.();

  return {
    /**
     * Check if a request from this IP should be rate-limited.
     * Returns null if allowed, or { retryAfterMs } if limited.
     */
    check(ip: string): { retryAfterMs: number } | null {
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now > entry.resetAt) {
        // Fresh window
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return null;
      }

      entry.count++;
      if (entry.count > maxRequests) {
        return { retryAfterMs: entry.resetAt - now };
      }

      return null;
    },
  };
}
