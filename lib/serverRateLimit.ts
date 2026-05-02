/**
 * Server-side rate limiter for AI tool generation requests.
 *
 * Implements a simple in-memory sliding-window rate limiter.
 * In production, replace with Cloudflare Workers KV or Upstash Redis
 * for persistence across edge function instances.
 *
 * Rate limit: FREE_DAILY_LIMIT generations per IP per 24h window.
 */

const FREE_DAILY_LIMIT = 15;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  Array.from(store.entries()).forEach(([key, entry]) => {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  });
}, 10 * 60 * 1000).unref();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter: number | null; // ms until next available slot
}

/**
 * Check if a request is rate-limited.
 * Returns the rate limit status and headers-compatible info.
 */
export function checkRateLimit(request: Request): RateLimitResult {
  const clientIp = getClientIp(request);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let entry = store.get(clientIp);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(clientIp, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  const used = entry.timestamps.length;
  const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
  const allowed = used < FREE_DAILY_LIMIT;

  let retryAfter: number | null = null;
  if (!allowed && entry.timestamps.length > 0) {
    // Next slot becomes available 24h after the first timestamp in the window
    retryAfter = Math.max(0, entry.timestamps[0] + WINDOW_MS - now);
  }

  return { allowed, remaining, limit: FREE_DAILY_LIMIT, retryAfter };
}

/**
 * Record a successful generation for rate limiting.
 * Call this AFTER a successful Gemini API response.
 */
export function recordGeneration(request: Request): void {
  const clientIp = getClientIp(request);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let entry = store.get(clientIp);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(clientIp, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  entry.timestamps.push(now);
}

/**
 * Get rate limit headers for response.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.retryAfter
      ? String(Math.ceil(result.retryAfter / 1000))
      : "0",
  };
}
