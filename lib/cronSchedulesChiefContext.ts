/**
 * Human-readable **UTC** schedule + LCM math for Cloudflare `triggers.crons` + `custom-worker` `scheduled()`.
 * Used in Chief `buildOpsSnapshot` (inbound). Dashboard `AGENTIC_DASHBOARD_PUBLISH_CYCLE_MS` (default 2h) is **display** only for article cadence bar.
 */
export function getCloudflareWorkerCronMatrixForChief(): string {
  const lines = [
    "Routes (each trigger = one `POST` with `Authorization: Bearer AGENTIC_CRON_SECRET`):",
    "  `0 * * * *`  (hourly, 24/day)     → /api/cron/agentic-incremental — topic-bank SEO → Publishing → optional site (one vertical/tick; **incremental** article path).",
    "  `*/10 * * * *`  (144/day)  → /api/cron/agentic-chief-sweep — Chief trend read, no Serp.",
    "  `0 */2 * * *`  (12/day: 0,2,4,…,22 UTC) → /api/cron/agentic-publish — **full** one-shot article pipeline + site when approved (restored 2h slot).",
    "  `0 */3 * * *`  (8/day: 0,3,6,9,12,15,18,21 UTC) → /api/cron/news-run — full news pipeline in one request (Pre-Prod → … → `news_items`).",
    "",
    "Interval math (UTC, on the hour):",
    "  - Incremental article work: **1 h** between hourly ticks; independent of 2h full `agentic-publish`.",
    "  - Full article publish: **2 h** between `agentic-publish` fires → **12** windows/day.",
    "  - News: **3 h** between `news-run` fires → **8** windows/day.",
    "  - **lcm(2,3) = 6 h** — at **00:00, 06:00, 12:00, 18:00** UTC the **2h and 3h** crons both fire in the same clock minute (two separate Worker invocations: one `agentic-publish`, one `news-run`).",
    "  - Optional overlap load: if a run is long, consider staggering in Cloudflare (offset triggers) or reducing concurrency in env; not auto-delayed in app code.",
  ];
  return lines.join("\n");
}
