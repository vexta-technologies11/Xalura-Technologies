# Xalura Agentic — Employee handbook (org, ladder, APIs)

This document describes the **agentic system** as if each automated role were an **employee** on a fixed reporting line. It reflects the current codebase under `xalura-agentic/` and related Next.js API routes.

---

## 1. Executive summary

| Concept | What it is in code |
|--------|---------------------|
| **Employee roles** | Gemini-backed prompts with fixed titles: **Worker**, **Manager**, **Executive**, **Chief AI** (`runAgent` / `runChiefAI` in `xalura-agentic/lib/gemini.ts`, `xalura-agentic/agents/*.ts`). |
| **Departments** | Three pipelines: **SEO & Audit**, **Publishing**, **Marketing** (`xalura-agentic/engine/departments.ts`, `xalura-agentic/departments/*/pipeline.ts`). |
| **Reporting line** | **Worker → Manager → Executive** on every department run; **Chief AI** reviews **audit windows** and scheduled **oversight**. |
| **Fourteen lane workers (×2)** | For **SEO** and **Publishing**, each **`CONTENT_VERTICALS` id** is a **separate desk**: its own **Worker** runs (same code, different `contentVerticalId`), own **Manager/Executive cycle files** under `logs/{dept}/lanes/{vertical_id}/`, and own row in `data/cycle-state.json` → **`agentLanes["seo:…"]` / `agentLanes["publishing:…"]`**. |
| **Marketing** | **One** department Worker pool (no vertical split in `cycleEngine` today). |
| **Topic assignment** | Lane Workers take the **next unused** `topic-bank.json` row whose **`vertical_id`** matches their desk; keywords and angles come from that row until the bank is refilled (Serp governed by `AGENTIC_TOPIC_BANK_MIN_SERP_INTERVAL_HOURS`). |

---

## 2. Organization chart — full roster (who reports to whom)

### 2.1 Top of house (everyone rolls up here)

```text
                              ┌──────────────────────┐
                              │      Chief AI       │
                              │  (oversight / mail) │
                              └──────────┬──────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
  ┌──────▼──────┐                  ┌──────▼──────┐                  ┌──────▼──────┐
  │ Executive   │                  │ Executive   │                  │ Executive   │
  │ Marketing   │                  │ Publishing  │                  │ SEO & Audit │
  └──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
         │                               │                               │
  ┌──────▼──────┐                  ┌──────▼──────┐                  ┌──────▼──────┐
  │  Manager    │                  │  Manager    │                  │  Manager    │
  │ Marketing   │                  │ Publishing  │                  │ SEO & Audit │
  └──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
         │                               │                               │
  ┌──────▼──────┐         ┌──────────────┴──────────────┐   ┌───────────┴───────────┐
  │   Worker    │         │  14 × Publishing Workers    │   │  14 × SEO Workers     │
  │  (single    │         │  (one per vertical lane)    │   │  (one per vertical)   │
  │   pool)     │         │  W-P-01 … W-P-14            │   │  W-S-01 … W-S-14      │
  └─────────────┘         └─────────────────────────────┘   └───────────────────────┘
```

- **Managers and Executives** are still **one logical role per department per run**; what multiplies is the **Worker desk** + **cycle file tree** for **SEO** and **Publishing** when `contentVerticalId` / topic bank **`vertical_id`** is set.
- **Handoff:** each **SEO lane Worker** who completes an approved run issues **`KEYWORD_READY`** with that desk’s **`vertical_id`**; the **Publishing lane Worker** for the **same** vertical consumes it (same id) so the “topic assignment” stays matched end-to-end.

### 2.2 The fourteen paired desks (topic beat = `vertical_id`)

These ids are defined in `xalura-agentic/lib/contentWorkflow/contentVerticals.ts` (`CONTENT_VERTICALS`). Each row is **one assigned beat** for both **SEO Worker** and **Publishing Worker** on that lane.

| # | `vertical_id` (API / state key) | Desk label | **Assigned topic beat** (what they own) | Regulated lane |
|---|----------------------------------|------------|-------------------------------------------|----------------|
| 01 | `business-startups` | Business & startups | AI pricing, GTM stack, SMB automation | No |
| 02 | `product-engineering` | Product & engineering | Spec-to-code, evals, shipping AI features | No |
| 03 | `developer-tools-oss` | Developer tools & OSS | SDKs, agents in CI, local models | No |
| 04 | `cloud-infrastructure` | Cloud & infrastructure | Inference cost, regions, GPU/CPU tradeoffs | No |
| 05 | `security-trust` | Security & trust | Red team for LLMs, data leakage, supply chain | No |
| 06 | `data-mlops` | Data & MLOps | Pipelines, observability, RAG hygiene | No |
| 07 | `education-skills` | Education & skills | Curricula, certifications, practitioner paths | No |
| 08 | `marketing-growth-tech` | Marketing & growth tech | SEO + AI, attribution, content ops | No |
| 09 | `entertainment-media-tech` | Entertainment & media tech | Streaming infra, tooling, rights tech (not gossip) | No |
| 10 | `environment-climate-tech` | Environment & climate tech | Energy use of training/inference, green DC angle | No |
| 11 | `workplace-hr-tech` | Workplace & HR tech | Copilots at work, bias/process (careful tone) | No |
| 12 | `healthcare-bioinformatics` | Healthcare / bioinformatics | Tooling & research infra; **no clinical claims** | **Yes** |
| 13 | `legal-compliance-tooling` | Legal / compliance tooling | Product-focused compliance tech; **not legal advice** | **Yes** |
| 14 | `gov-civic-tech` | Gov / civic tech | Procurement, public-sector AI adoption | No |

**Per-desk file paths (isolated 10-cycle ladder toward Chief):**

| Lane | SEO cycle & audits | Publishing cycle & audits |
|------|--------------------|----------------------------|
| Each `vertical_id` | `xalura-agentic/logs/seo/lanes/{vertical_id}/` | `xalura-agentic/logs/publishing/lanes/{vertical_id}/` |

**How a topic is assigned to a desk:** the **topic bank** stores rows with **`vertical_id`**. When you call the pipeline with `contentVerticalId: "<id>"` (or the hourly incremental cron rotates to that id), **`getNextTopic`** selects the highest-scoring **unused** row for **that** `vertical_id`. The **primary keyword**, **supporting keywords**, **source_urls**, and optional **`angle`** in that row are what that shift’s **Worker** must execute.

### 2.3 Marketing Worker (department-wide)

| Role | Assignment |
|------|------------|
| **Worker** | No `vertical_id` in code today — one **Marketing** task per run (campaign / growth narrative). |
| **Logs** | `xalura-agentic/logs/marketing/` (no `lanes/` subtree). |
| **After Publishing handoff** | May consume **`ARTICLE_PUBLISHED`** when using `runMarketingPipelineWithHandoff`. |

### 2.4 Topic bank “research desk” (batch, not a department ladder)

| Role | Title in Gemini | Assignment |
|------|-----------------|------------|
| **Topic ranker** | `Worker` in `geminiTopicRanker.ts` | Reads **one** Serp snapshot + Firecrawl digest; outputs **~20** ranked topics, each stamped with a **`vertical_id`** so desks 01–14 get fresh lines on the board. |
| **Bank auditor** | `Worker` in `geminiBankAuditor.ts` | Reviews **used** topics + GSC summary; suggests cooldowns and next crawl hints. |

These **do not** write to `logs/seo/lanes/…` as cycle-1..10; they only **feed** `topic-bank.json` and audits.

### 2.5 Department-default SEO / Publishing (no lane)

If **`contentVerticalId`** is omitted **and** there is no **`vertical_id`** on the topic (legacy), cycles still go to **`logs/seo/`** or **`logs/publishing/`** without a `lanes/` subfolder — treat as the **“general pool”** desk.

---

## 3. Departments (business units)

| Department | `departmentId` | Primary responsibility |
|------------|----------------|-------------------------|
| **SEO & Audit** | `seo` | Keyword / topic research, SEO rationale, bundles for Publishing when using the **topic bank** (`useTopicBank`). |
| **Publishing** | `publishing` | Long-form **Markdown articles** (and related deliverables) ready for site upsert when configured. |
| **Marketing** | `marketing` | Campaign / distribution-oriented work; may use **Zernio** after approval (Phase 7). |

Each department run uses the **same ladder**: Worker → Manager (up to 3 rounds) → optional Executive escalation → `recordApproval` on success.

---

## 4. Role handbook (Worker → Chief)

### 4.1 Worker (including all fourteen lane desks)

- **Reports to:** Manager (same department label: SEO & Audit, Publishing, or Marketing).
- **Lane desks (01–14):** Same **Worker** implementation; **assignment** = **`vertical_id`** + the **topic bank row** selected for that id. Prompt prefix includes desk label and keyword bundle (`runDepartmentPipeline`).
- **Does:** Executes the **task** string plus structured context (keyword, `vertical_id`, `angle`, Phase 7 snippets — see `runDepartmentPipeline`, `buildPhase7WorkerContext`).
- **APIs / infra (indirect):** Runtime may attach **Firecrawl** / **GSC** context before the Worker call; Worker role itself only calls **Gemini**.
- **Output:** Free text (often Markdown for Publishing). Manager line must be **`APPROVED`** / **`REJECTED`**.

### 4.2 Manager

- **Reports to:** Executive on escalation; otherwise Executive summary closes the approved pass.
- **Does:** Reviews Worker output; **`parseManagerDecision`** on first line.
- **APIs:** Gemini (`Manager`).

### 4.3 Executive

- **Does:** Post-approval summary for the department; may note **vertical lane** for SEO/Publishing.
- **APIs:** Gemini (`Executive`).

### 4.4 Chief AI

- **Reports to:** *You* (product/ops).
- **Does:** Audit enrichment (`enrichAuditWithChief`), **scheduled sweeps** (`chiefCronSweep` / `POST /api/cron/agentic-chief-sweep`), publish/digest mail (`chiefPublishDigest`, `phase7Alerts`), inbound Chief (`lib/chiefInboundReply.ts`).
- **APIs:** Gemini (`runChiefAI`); **Resend** where mail is enabled.

---

## 5. Content workflow & research desk (topic bank)

| Step | Module | Responsibility |
|------|--------|------------------|
| **Serp research** | `serpApiSearch` | One **SerpAPI** call per **full** refresh (budget-sensitive). |
| **Page capture** | `firecrawlScrape` | Markdown excerpts for ranking. |
| **Topic ranking** | `rankTopicsWithGemini` | **~20** rows; ranks **1–14** should cover each **`vertical_id`** once, then extras. |
| **Trend log** | `seoTrendLogsStore` | `state/seo-trend-logs.json`. |
| **Bank audit** | `auditPreviousTopicBank` | GSC + Gemini; cooldowns. |

**Cadence:** `AGENTIC_TOPIC_BANK_MIN_SERP_INTERVAL_HOURS` (default **72**) limits full Serp refresh while **unused** topics remain.

---

## 6. Handoffs (inter-department mail)

| Event | Emitted by | Consumed by | Payload highlights |
|-------|------------|-------------|----------------------|
| `KEYWORD_READY` | SEO (handoff) after approval | Publishing (handoff) | `keywords`, `content_type`, `subcategory`, `source_urls`, **`vertical_id` / `vertical_label`** |
| `ARTICLE_PUBLISHED` | Publishing (handoff) after approval | Marketing (handoff) | `article_id`, `title`, `url` |
| `TOPIC_BANK_REFRESHED` | Topic bank refresh | Observability | counts, paths |

---

## 7. APIs & external services

| Service | Env (typical) | Used for |
|---------|---------------|----------|
| **Google Gemini** | `GEMINI_API_KEY`, `GEMINI_MODEL`, `AGENTIC_GEMINI_*` | Worker / Manager / Executive / Chief. |
| **SerpAPI** | `SERPAPI_API_KEY`, `SERPAPI_ENGINE` | Topic bank search. |
| **Firecrawl** | `FIRECRAWL_API_KEY`, `FIRECRAWL_BASE_URL` | Rank context + optional `referenceUrl`. |
| **Google Search Console** | `GOOGLE_SC_*`, `GOOGLE_SC_SITE_URL` | Bank audit / SEO context. |
| **Resend** | `RESEND_API_KEY`, `RESEND_FROM`, digest/ops inboxes | Mail. |
| **Zernio** | `ZERNIO_API_KEY`, `ZERNIO_API_BASE` | Marketing / optional post. |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | Site upsert after approve. |

Secrets: **`resolveWorkerEnv`** (Node + Workers).

---

## 8. HTTP routes (trigger a “shift”)

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/agentic/run` | `AGENTIC_RUN_TOKEN` / ingest | One department run; `useTopicBank`, **`contentVerticalId`** = desk id. |
| `/api/agentic-health` | Optional debug | Health. |
| `POST /api/agentic/content/refresh-topic-bank` | Run auth | **Force** Serp refresh (all desks get new rows). |
| `POST /api/cron/agentic-incremental` | `AGENTIC_CRON_SECRET` | Hourly round-robin **one** desk: SEO → Publishing → optional site. |
| `POST /api/cron/agentic-chief-sweep` | `AGENTIC_CRON_SECRET` | Chief snapshot ~10 min. |
| `POST /api/cron/agentic-publish` | `AGENTIC_CRON_SECRET` | Legacy publishing-only cron. |

**Worker:** `custom-worker.ts` + `wrangler.jsonc` crons → above URLs with **`AGENTIC_CRON_BASE_URL`**.

---

## 9. Files & paper trail

| Artifact | Path |
|----------|------|
| Lane cycles | `logs/seo/lanes/{vertical_id}/`, `logs/publishing/lanes/{vertical_id}/` |
| Dept-default cycles | `logs/{department}/` (no `lanes/`) |
| Cycle state | `data/cycle-state.json` → `agentLanes["seo:vertical_id"]`, etc. |
| Topic bank | `state/topic-bank.json` |
| Trend log | `state/seo-trend-logs.json` |
| Queue | `shared/event-queue.log` |
| Chief sweep | `state/chief-sweep-log.jsonl` |
| Hourly cadence | `state/incremental-cadence.json` |

---

## 10. Optional display names

`xalura-agentic/config/agents.json` can name **Worker / Manager / Executive** per **department** (not yet per **vertical_id** — you can extend later so “W-S-10” has a human name).

---

## 11. Adding new `departments/*`

1. Call `runDepartmentPipeline` with stable `departmentId` + labels.  
2. Wire **handoffs** if the department joins the queue.  
3. Document new **APIs** in §7 and use **`resolveWorkerEnv`**.

---

*Aligned with `CONTENT_VERTICALS`, per-vertical `agentLanes`, and incremental cron. Update when the roster or routes change.*
