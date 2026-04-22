/** Default agent LLM timeout (ms) — PDF suggested 60s. */
export const DEFAULT_AGENT_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`TIMEOUT: ${label} after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export async function withTimeout<T>(
  ms: number,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  try {
    return await Promise.race([fn(), timer]);
  } finally {
    if (id) clearTimeout(id);
  }
}

const DEFAULT_BACKOFF_MS = [1000, 3000, 7000];

export type WithRetriesOptions = {
  maxAttempts: number;
  backoffMs?: number[];
  label?: string;
};

/**
 * Retries async `fn` with exponential-ish backoff between failures.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: WithRetriesOptions,
): Promise<T> {
  const { maxAttempts, backoffMs = DEFAULT_BACKOFF_MS, label = "retry" } =
    options;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt < maxAttempts - 1) {
        const wait = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1] ?? 1000;
        await sleep(wait);
      }
    }
  }
  throw last instanceof Error
    ? last
    : new Error(`${label}: ${String(last)}`);
}
