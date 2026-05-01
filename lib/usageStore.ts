/**
 * Client-side usage store with 24-hour cooldown.
 * Persists in localStorage with timestamps so quota resets work
 * even across browser restarts. Uses a device fingerprint (MAC-style)
 * for rate-limit identification without requiring auth.
 *
 * Admin users (identified by Supabase session) bypass all limits.
 */

const STORAGE_KEY = "xalura_usage_v2";
const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const FREE_DAILY_LIMIT = 15; // 15 generations/day for free users

interface UsageRecord {
  /** Timestamps of each generation (ms since epoch) */
  timestamps: number[];
  /** Last reset timestamp */
  lastResetAt: number;
  /** Device fingerprint */
  deviceId: string;
  /** Whether the user is admin (bypassed) */
  isAdmin: boolean;
}

interface DailyUsage {
  used: number;
  limit: number;
  isBlocked: boolean;
  remaining: number;
  windowStart: number;
  windowEnd: number;
}

function getStorage(): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UsageRecord;
      // Ensure deviceId exists
      if (!parsed.deviceId) {
        parsed.deviceId = generateDeviceId();
      }
      return parsed;
    }
  } catch {
    // Corrupted data — reset
  }
  return {
    timestamps: [],
    lastResetAt: Date.now(),
    deviceId: generateDeviceId(),
    isAdmin: false,
  };
}

function saveStorage(record: UsageRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage full or disabled — silently fail
  }
}

/**
 * Generate a basic device fingerprint.
 * Not used for security — just a reasonable identifier
 * to make casual abuse harder (clearing localStorage resets it).
 */
function generateDeviceId(): string {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const scr = typeof screen !== "undefined" ? screen : null;

  const components = [
    nav?.userAgent || "",
    nav?.language || "",
    scr?.width || "",
    scr?.height || "",
    scr?.colorDepth || "",
    // Timezone offset
    new Date().getTimezoneOffset(),
    // Hardware concurrency
    nav?.hardwareConcurrency || "",
  ];

  const raw = components.join("|||");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16)}`;
}

/**
 * Get the current usage window boundaries.
 * Aligns to 24h from first use, or current time if no usage.
 */
function getWindowBounds(storage: UsageRecord): { start: number; end: number } {
  const now = Date.now();
  if (storage.timestamps.length === 0) {
    return { start: now, end: now + USAGE_WINDOW_MS };
  }
  const firstInWindow = storage.timestamps[0];
  const end = firstInWindow + USAGE_WINDOW_MS;

  // If window has expired, reset
  if (now >= end) {
    return { start: now, end: now + USAGE_WINDOW_MS };
  }
  return { start: firstInWindow, end };
}

/**
 * Check if current window has expired and reset if needed.
 */
function pruneExpired(storage: UsageRecord): void {
  const now = Date.now();
  // Filter out timestamps older than 24h
  const cutoff = now - USAGE_WINDOW_MS;
  storage.timestamps = storage.timestamps.filter((ts) => ts > cutoff);

  // If all timestamps pruned, update lastResetAt
  if (storage.timestamps.length === 0) {
    storage.lastResetAt = now;
  }
}

/**
 * Get daily usage info.
 */
export function getDailyUsage(): DailyUsage {
  const storage = getStorage();
  pruneExpired(storage);

  // Admin bypass
  if (storage.isAdmin) {
    return { used: 0, limit: Infinity, isBlocked: false, remaining: Infinity, windowStart: 0, windowEnd: 0 };
  }

  const used = storage.timestamps.length;
  const isBlocked = used >= FREE_DAILY_LIMIT;
  const windowBounds = getWindowBounds(storage);

  return {
    used,
    limit: FREE_DAILY_LIMIT,
    isBlocked,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
    windowStart: windowBounds.start,
    windowEnd: windowBounds.end,
  };
}

/**
 * Increment usage (after a successful generation).
 * Returns updated daily usage info.
 */
export function incrementDailyUsage(): DailyUsage {
  const storage = getStorage();
  pruneExpired(storage);

  // Admin bypass — no tracking
  if (storage.isAdmin) {
    return { used: 0, limit: Infinity, isBlocked: false, remaining: Infinity, windowStart: 0, windowEnd: 0 };
  }

  // Don't increment if already at limit
  if (storage.timestamps.length >= FREE_DAILY_LIMIT) {
    const windowBounds = getWindowBounds(storage);
    return {
      used: storage.timestamps.length,
      limit: FREE_DAILY_LIMIT,
      isBlocked: true,
      remaining: 0,
      windowStart: windowBounds.start,
      windowEnd: windowBounds.end,
    };
  }

  storage.timestamps.push(Date.now());
  saveStorage(storage);

  const used = storage.timestamps.length;
  const isBlocked = used >= FREE_DAILY_LIMIT;
  const windowBounds = getWindowBounds(storage);

  return {
    used,
    limit: FREE_DAILY_LIMIT,
    isBlocked,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
    windowStart: windowBounds.start,
    windowEnd: windowBounds.end,
  };
}

/**
 * Reset daily usage (admin action).
 */
export function resetDailyUsage(): void {
  const storage = getStorage();
  storage.timestamps = [];
  storage.lastResetAt = Date.now();
  saveStorage(storage);
}

/**
 * Set admin mode. When admin, all generation limits are bypassed.
 */
export function setAdminMode(isAdmin: boolean): void {
  const storage = getStorage();
  storage.isAdmin = isAdmin;
  saveStorage(storage);
}

/**
 * Get remaining time until cooldown resets (in milliseconds).
 */
export function getCooldownRemaining(): number {
  const storage = getStorage();
  if (storage.isAdmin || storage.timestamps.length === 0) return 0;

  const windowBounds = getWindowBounds(storage);
  const remaining = Math.max(0, windowBounds.end - Date.now());
  return remaining;
}

/**
 * Format cooldown time for display.
 */
export function formatCooldown(ms: number): string {
  if (ms <= 0) return "Available now";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
