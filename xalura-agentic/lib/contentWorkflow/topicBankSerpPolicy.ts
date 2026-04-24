/**
 * Limits full topic-bank Serp + Firecrawl + Gemini refreshes (budget + cadence).
 * Hourly incremental runs consume **existing** unused topics without new Serp until interval elapses.
 */

export function minSerpIntervalHoursFromEnv(): number {
  const raw = process.env["AGENTIC_TOPIC_BANK_MIN_SERP_INTERVAL_HOURS"]?.trim();
  if (!raw) return 72;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 72;
  return n;
}

export function hoursSinceLastTopicBankCrawl(lastCrawledAt: string | null): number {
  if (!lastCrawledAt) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(lastCrawledAt).getTime()) / 3_600_000;
}
