# Xalura agentic engine (in-repo)

Architecture for the PDF spec: Worker → Manager → Executive → Chief AI, markdown logs, 10-cycle audits.

- **Progress:** `docs/agentic-workflow-architecture-log.md` (update every phase).
- **Phase 1:** Folders + stubs + `npm run agentic:dry-run` (sample `logs/publishing/cycle-1.md`).
- **Phase 2:** Cycle counters in `data/cycle-state.json` (gitignored), `recordApproval()` → `cycle-1..10.md`, then `audit-cycle-N.md`; Chief stub → `reports/chief-ai-daily-YYYY-MM-DD.md`. Try `npm run agentic:cycle-demo`.
- **Phase 3:** Publishing vertical — `runPublishingPipeline()` (Worker → Manager → Executive → `recordApproval`). Optional **`GEMINI_API_KEY`** / **`GEMINI_MODEL`** (`gemini-2.0-flash` default). Try `npm run agentic:publishing-demo`.
- **Phase 4:** Marketing (`runMarketingPipeline`) and SEO (`runSeoPipeline`) share **`lib/runDepartmentPipeline`**. Try `npm run agentic:all-departments-demo`.
- **Phase 5:** **`shared/event-queue.log`** (append-only, gitignored) + **`lib/handoff.ts`** — SEO emits `KEYWORD_READY`; Publishing needs it (or `skipUpstreamCheck`); Publishing emits `ARTICLE_PUBLISHED`; Marketing needs it (or `skipUpstreamCheck`). Try `npm run agentic:handoff-demo`.
- **Smoke test:** `npm run agentic:verify` (fast checks — add `next build` / `agentic:cycle-demo` manually when needed).
- **Phase 6:** `withTimeout` / `withRetries` around live Gemini; failures append **`failed/operations-queue.json`** then fall back to stubs. Tune **`AGENTIC_GEMINI_TIMEOUT_MS`**, **`AGENTIC_GEMINI_RETRIES`**. Health: **`GET /api/agentic-health`**, CLI **`npm run agentic:status`**.
- **More APIs:** Resend, Serper, etc. — Phase 7 per the log.

**Note:** `cycle-1..10.md` are **overwritten** each new window after an audit (same filenames as the PDF). Archive externally if you need history.
