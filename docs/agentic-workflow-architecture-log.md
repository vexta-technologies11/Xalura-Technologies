# Xalura Agentic Workflow — architecture log

**Purpose:** Single place to record what is **implemented** vs **not done** for the agentic engine (Worker → Manager → Executive → Chief AI, 10-cycle audits, markdown logs). **Update this file when a phase ships** so Cursor / humans don’t assume features exist.

**Spec source:** `XALURA_AGENTIC_WORKFLOW_md.pdf` (local download). Optional third-party APIs beyond Gemini live in **`lib/phase7Clients.ts`** (Phase 7); pipeline hooks into departments are still optional.

**Last updated:** 2026-04-19 (Phase 7 clients + health flags)

---

## Phase 7 — External HTTP clients (wired)

**Status:** **`xalura-agentic/lib/phase7Clients.ts`** exposes typed helpers; **`GET /api/agentic-health`** includes **`phase7`** (`resend`, `firecrawl`, `zernio`, `google_search_console`) when keys/bindings are set. Pipelines still call **Gemini** only for LLM text — wire Resend/Firecrawl/Zernio/GSC into department flows as needed.

| Integration | Code | Env (typical) |
|-------------|------|---------------|
| **Gemini** | `lib/gemini.ts` | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| **Resend** | `sendResendEmail` | `RESEND_API_KEY`, optional `RESEND_FROM` |
| **Firecrawl** | `firecrawlScrape` | `FIRECRAWL_API_KEY`, optional `FIRECRAWL_BASE_URL` |
| **[Zernio](https://zernio.com/)** | `zernioListProfiles` | `ZERNIO_API_KEY`, optional `ZERNIO_API_BASE` |
| **Google Search Console** | `gscSearchAnalyticsQuery` | `GOOGLE_SC_CLIENT_ID`, `GOOGLE_SC_SECRET`, `GOOGLE_SC_REFRESH_TOKEN`, `GOOGLE_SC_SITE_URL` |

**Explicitly out:** Ghost, Open edX — content stays **on-site**; courses built with **our own AI**, not external LMS publishers.

---

## Verification (audit)

**Last full pass:** 2026-04-21 — `tsc --noEmit`, `npm run lint`, `npm run build`, and agentic scripts: `agentic:dry-run`, `agentic:cycle-demo`, `agentic:publishing-demo`, `agentic:all-departments-demo`, `agentic:handoff-demo` — all **OK**.

**Repeat locally:** `npm run agentic:verify` (runs typecheck, lint, dry-run, publishing-demo, all-departments-demo — does **not** run `next build` or `cycle-demo` to keep it fast; run those separately when needed).

**Known behavior:** `agentic:dry-run` **overwrites** `logs/publishing/cycle-1.md` without updating `data/cycle-state.json` — intentional sample file only.

---

## How to use (avoid drift)

1. After meaningful work, tick boxes or add a one-line note under **Session notes**.
2. If scope changes, edit **Phases** — don’t leave stale checkmarks.
3. Prefer linking to real paths — see **Code anchors** below.

---

## Code anchors

| Item | Path |
|------|------|
| Agentic root | `xalura-agentic/` |
| Phase constant | `xalura-agentic/engine/version.ts` (`AGENTIC_IMPLEMENTATION_PHASE`) |
| Gemini / LLM | `xalura-agentic/lib/gemini.ts` (stub if no `GEMINI_API_KEY`; else `@google/generative-ai`) |
| Manager parse | `xalura-agentic/lib/managerDecision.ts` |
| Markdown templates | `xalura-agentic/lib/templates.ts` |
| Cycle persistence | `xalura-agentic/data/cycle-state.json` (**gitignored** — created at runtime) |
| Cycle engine API | `xalura-agentic/engine/cycleEngine.ts` (`recordApproval`, `getCycleSnapshot`) |
| Chief stub | `xalura-agentic/engine/chiefStub.ts` |
| **Shared vertical** | `xalura-agentic/lib/runDepartmentPipeline.ts` (`runDepartmentPipeline`) |
| **Publishing** | `xalura-agentic/departments/publishing/` (`runPublishingPipeline`) |
| **Marketing** | `xalura-agentic/departments/marketing/` (`runMarketingPipeline`) |
| **SEO** | `xalura-agentic/departments/seo/` (`runSeoPipeline`) |
| **Event queue (Phase 5)** | `xalura-agentic/lib/eventQueue.ts` → append-only `shared/event-queue.log` (gitignored) |
| **Handoff + WAITING** | `xalura-agentic/lib/handoff.ts` (`runSeoPipelineWithHandoff`, `runPublishingPipelineWithHandoff`, `runMarketingPipelineWithHandoff`) |
| Agents | `xalura-agentic/agents/{worker,manager,executive,chiefAI}.ts` |
| Dry-run (sample log) | `npm run agentic:dry-run` → `xalura-agentic/logs/publishing/cycle-1.md` |
| Cycle demo (10 approvals + audit + chief report) | `npm run agentic:cycle-demo` |
| Publishing vertical demo | `npm run agentic:publishing-demo` |
| All three departments demo | `npm run agentic:all-departments-demo` |
| Handoff chain demo | `npm run agentic:handoff-demo` |
| **Watchdog (Phase 6)** | `xalura-agentic/lib/watchdog.ts` (`withTimeout`, `withRetries`) |
| **Failed queue** | `xalura-agentic/lib/failedQueue.ts` → `failed/operations-queue.json` (gitignored) |
| **Health payload** | `xalura-agentic/lib/agenticStatus.ts` (`getAgenticHealth`) — includes **`phase7`** |
| **Phase 7 HTTP** | `xalura-agentic/lib/phase7Clients.ts` |
| **Worker env read** | `xalura-agentic/lib/resolveWorkerEnv.ts` (shared with Gemini) |
| HTTP health | `GET /api/agentic-health` |
| CLI status | `npm run agentic:status` |

---

## Legend

| Symbol | Meaning |
|--------|--------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |

---

## Phases (architecture-first, APIs later)

### Phase 1 — Skeleton

- [x] Repo / package layout: `config/`, `lib/` (gemini stub), `agents/`, `departments/`, `engine/`, `logs/` + `reports/` (`.gitignore` for generated `*.md`, `.gitkeep` for dirs)
- [x] `config/agents.json` schema + example (names optional post-deploy)
- [x] **Dry run:** `npm run agentic:dry-run` → writes `logs/publishing/cycle-1.md` (no API)

### Phase 2 — Cycle engine

- [x] Per-department cycle counter — **`xalura-agentic/data/cycle-state.json`** (not committed; see `.gitignore`)
- [x] **10 approved outputs → audit** — `recordApproval()` writes `logs/{dept}/cycle-{1..10}.md`, then `audit-cycle-{N}.md`, resets window
- [x] Markdown templates — `lib/templates.ts` (`renderCycleLog`, `renderAuditLog`)
- [x] Chief AI **hook (stub)** — `chiefStub.ts` reads state → `reports/chief-ai-daily-YYYY-MM-DD.md`

### Phase 3 — One department vertical (default: Publishing)

- [x] Worker → Manager → Executive pipeline — `runPublishingPipeline` in `departments/publishing/pipeline.ts`
- [x] Gemini **optional** — `GEMINI_API_KEY` + optional `GEMINI_MODEL` → live `generateContent`; otherwise stubs (Manager stub returns `APPROVED` first line)

### Phase 4 — All three departments

- [x] Marketing — `runMarketingPipeline` (`taskType: Campaign`) in `departments/marketing/`
- [x] Publishing — refactored to shared `runDepartmentPipeline` (Phase 3 behavior unchanged)
- [x] SEO — `runSeoPipeline` (`taskType: Keyword`) in `departments/seo/`

### Phase 5 — Inter-department wiring

- [x] Handoff — append-only **`shared/event-queue.log`** (JSON lines): `KEYWORD_READY` (after SEO approval), `ARTICLE_PUBLISHED` (after Publishing handoff approval). See `lib/eventQueue.ts`.
- [x] **WAITING** — `runPublishingPipelineWithHandoff` requires latest `KEYWORD_READY` unless `skipUpstreamCheck`; `runMarketingPipelineWithHandoff` requires latest `ARTICLE_PUBLISHED` unless `skipUpstreamCheck`. `runSeoPipelineWithHandoff` emits `KEYWORD_READY` on approval.

### Phase 6 — Resilience

- [x] Timeouts + retries — `lib/watchdog.ts`; Gemini uses `withTimeout` + `withRetries` (env: `AGENTIC_GEMINI_TIMEOUT_MS`, `AGENTIC_GEMINI_RETRIES`). On total failure → `appendFailedOperation` + stub output.
- [x] Failed queue — `failed/operations-queue.json` (last 200 entries, gitignored)
- [x] Health — **`GET /api/agentic-health`** (Next) and **`npm run agentic:status`** (CLI JSON)

### Phase 7 — External APIs

- [x] `GEMINI_API_KEY` — wired in `lib/gemini.ts` when set
- [x] **HTTP clients** — `lib/phase7Clients.ts` (Resend, Firecrawl, Zernio, GSC Search Analytics); health **`phase7`** flags; `lib/resolveWorkerEnv.ts` for Worker `env`
- [ ] **Pipeline hooks** — call clients from department / chief flows (optional)
- [ ] ~~Ghost / Open edX~~ — **not used** (on-site + own AI for courses)

---

## Session notes

| Date | What changed |
|------|----------------|
| 2026-04-19 | Log file created. No architecture code landed yet. |
| 2026-04-19 | **Phase 1:** Added `xalura-agentic/` skeleton, stubs, `agents.json`, `npm run agentic:dry-run`, `AGENTIC_IMPLEMENTATION_PHASE = 1`. |
| 2026-04-21 | **Phase 2:** `cycleStateStore`, `cycleEngine.recordApproval`, templates, `chiefStub`, `data/cycle-state.json`, `npm run agentic:cycle-demo`, `AGENTIC_IMPLEMENTATION_PHASE = 2`. |
| 2026-04-21 | **Phase 3:** `runPublishingPipeline`, `managerDecision`, Gemini live path + stub fallback, `npm run agentic:publishing-demo`, `AGENTIC_IMPLEMENTATION_PHASE = 3`. |
| 2026-04-21 | **Phase 4:** `runDepartmentPipeline`, Marketing + SEO folders, `npm run agentic:all-departments-demo`, `AGENTIC_IMPLEMENTATION_PHASE = 4`. |
| 2026-04-21 | **Audit:** tsc, lint, build, all agentic scripts green. **Phase 5:** `eventQueue`, `handoff.ts`, `npm run agentic:handoff-demo`, `npm run agentic:verify`, `AGENTIC_IMPLEMENTATION_PHASE = 5`. |
| 2026-04-21 | **Phase 6:** `watchdog`, `failedQueue`, resilient `gemini.ts`, `/api/agentic-health`, `npm run agentic:status`, `AGENTIC_IMPLEMENTATION_PHASE = 6`. |
| 2026-04-21 | **Phase 7 backlog documented** (Resend, Firecrawl, Zernio, GSC; no Ghost/edX). Pausing API wiring until another project is done. |
| 2026-04-19 | **Phase 7:** `phase7Clients.ts`, `resolveWorkerEnv.ts`, health `phase7`, `AGENTIC_IMPLEMENTATION_PHASE = 7`. |

---

## Better than only this file? (optional)

This markdown log is the right **human + AI** anchor. For stronger guarantees:

- **Git:** Commit messages like `agentic: phase 2 cycle engine` make history searchable.
- **Code:** `AGENTIC_IMPLEMENTATION_PHASE` in `xalura-agentic/engine/version.ts` — bump when phases ship.

Those **add** to this file; they don’t replace it.
