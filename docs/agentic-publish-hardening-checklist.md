# Agentic publish hardening — implementation checklist

This file records **what was changed in the repo** (verifiable in git) so expectations are not invented. Re-check each line against the cited paths after pull.

## 1) Admin “Run next queue tick & publish” (no custom task)

| # | Check | Where to verify |
|---|--------|-------------------|
| 1.1 | Admin `POST` no longer accepts a free-form publishing `task` body for the main flow. | `app/api/admin/agentic-publish/route.ts` — calls `runIncrementalHourlyPublish` only. |
| 1.2 | UI removed the task `<textarea>`; button sends `POST` with `{}`. | `components/admin/AgenticPublishBar.tsx` |
| 1.3 | One click runs **SEO (topic bank, vertical from cadence) → handoff `KEYWORD_READY` → Publishing handoff → site upsert**, same as hourly incremental. | `xalura-agentic/lib/incrementalContentCron.ts` + `xalura-agentic/lib/handoff.ts` |
| 1.4 | Admin forces site publish even if auto-publish env is off. | `IncrementalHourlyOptions.forceSitePublish` passed `true` from admin route. |

## 2) Article hero image on the **live** site (not email-only)

| # | Check | Where to verify |
|---|--------|-------------------|
| 2.1 | When `AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH` is `true`/`1`, code generates Imagen once (flash-lite prompt → Imagen). | `xalura-agentic/lib/publishingHeroImage.ts` |
| 2.2 | PNG is uploaded to Supabase Storage bucket **`article-covers`**; public URL written to `articles.cover_image_url`. | `lib/articleCoverStorage.ts`, `lib/agenticPublishingSite.ts`, `lib/agenticArticlePublish.ts` |
| 2.3 | Article page renders `cover_image_url` when set. | `app/articles/[slug]/page.tsx` |
| 2.4 | **You must create** the `article-covers` bucket in Supabase (public read, or adjust URL strategy). If the bucket is missing, upload fails → `failed/operations-queue.json` entry; article still publishes **without** cover. | Supabase Dashboard → Storage; see `supabase/schema.sql` comment block. |

## 3) Compliance / founder email reliability

| # | Check | Where to verify |
|---|--------|-------------------|
| 3.1 | Admin publish path **awaits** `executeFounderOversightPublishEmail` (inline), not only `waitUntil`, so the request does not return until Resend finishes (or errors). | `lib/agenticPublishingSite.ts` — `SitePublishOptions.awaitFounderOversight`; admin route passes `awaitFounderOversight: true` via incremental → `sitePublishFromApprovedPublishingRun(..., { awaitFounderOversight: true })`. |
| 3.2 | Cron / `POST /api/agentic/run` publish path still uses **scheduled** compliance (non-blocking) unless callers pass the await flag later. | `sitePublish` default: `scheduleFounderOversightPublishEmail` when `awaitFounderOversight` is not set. |
| 3.3 | Env gates unchanged: `AGENTIC_COMPLIANCE_ON_PUBLISH` **or** `AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH`; recipient chain `AGENTIC_COMPLIANCE_EMAIL` → `AGENTIC_FOUNDER_OVERSIGHT_EMAIL` → `AGENTIC_CHIEF_DIGEST_EMAIL`; `RESEND_API_KEY`. | `xalura-agentic/lib/founderOversightPublish.ts` |
| 3.4 | If Imagen produced bytes, compliance email **reuses** `precomputedHero` (no second Imagen call). | `FounderOversightPublishParams.precomputedHero` in `founderOversightPublish.ts` |

## 4) Incremental options (shared with admin)

| # | Check | Where to verify |
|---|--------|-------------------|
| 4.1 | `runIncrementalHourlyPublish(cwd, { forceSitePublish, awaitFounderOversight })` | `xalura-agentic/lib/incrementalContentCron.ts` |

## 5) Commands run to reduce regressions

| # | Command | Expected |
|---|---------|----------|
| 5.1 | `npx tsc --noEmit` | Exit `0` |
| 5.2 | `npm run agentic:verify` | Exit `0` (includes lint + demos + founder briefing smoke) |

---

*If any row disagrees with the code, update this file or revert the change — this checklist is the contract.*
