import { NextResponse } from "next/server";
import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { extractIngestBearerToken, getSharedIngestSecret } from "@/lib/ingestAuth";
import { runMarketingPipeline } from "@/xalura-agentic/departments/marketing";
import { runPublishingPipeline } from "@/xalura-agentic/departments/publishing";
import { runSeoPipeline } from "@/xalura-agentic/departments/seo";
import type { DepartmentId } from "@/xalura-agentic/engine/departments";
import {
  runMarketingPipelineWithHandoff,
  runPublishingPipelineWithHandoff,
  runSeoPipelineWithHandoff,
  type WaitingResult,
} from "@/xalura-agentic/lib/handoff";
import type {
  DepartmentPipelineInput,
  DepartmentPipelineResult,
} from "@/xalura-agentic/lib/runDepartmentPipeline";

function isWaitingResult(r: DepartmentPipelineResult | WaitingResult): r is WaitingResult {
  return r.status === "waiting";
}

function isBlockedResult(
  r: DepartmentPipelineResult | WaitingResult,
): r is Extract<DepartmentPipelineResult, { status: "blocked" }> {
  return r.status === "blocked";
}

export const dynamic = "force-dynamic";

function authorizeAgenticRun(request: Request): boolean {
  const token = extractIngestBearerToken(request);
  const runToken = process.env["AGENTIC_RUN_TOKEN"]?.trim();
  if (runToken) return !!token && token === runToken;
  const ingest = getSharedIngestSecret();
  return !!token && !!ingest && token === ingest;
}

function isDeptId(s: string): s is DepartmentId {
  return s === "marketing" || s === "publishing" || s === "seo";
}

/**
 * Run one department pipeline (Worker → Manager [retries] → Executive → cycle log).
 *
 * Auth: `Authorization: Bearer <AGENTIC_RUN_TOKEN>` if set, otherwise same secret as ingest (`INGEST_PASSWORD` chain).
 *
 * Body JSON:
 * - `department`: `marketing` | `publishing` | `seo`
 * - `task`: string (required)
 * - `keyword`: optional
 * - `useHandoff`: optional — SEO/Publishing/Marketing chain gates (see `handoff.ts`)
 * - `skipUpstreamCheck`: optional — only with `useHandoff`, for local tests
 * - `publishToSite`: optional — **Publishing only**: upsert `articles` in Supabase (requires service role env). Send `false` to opt out when `AGENTIC_AUTO_PUBLISH_TO_SITE=true`.
 * After successful publish: optional Chief email when `AGENTIC_CHIEF_EMAIL_ON_PUBLISH` + `AGENTIC_CHIEF_DIGEST_EMAIL` + Resend (see `chiefPublishDigest.ts`).
 * - `articleTitle`, `articleSlug`: optional overrides when publishing
 * - `skipChiefEnrich`: optional — skip live Chief append after a 10-cycle audit
 * - `referenceUrl`: optional — Firecrawl scrape into Worker context (any department)
 * - `skipPhase7Fetch`: optional — skip Firecrawl + GSC context fetches
 * - `useTopicBank`: optional — **SEO only**: topic bank (SerpAPI + Firecrawl + Gemini)
 * - `forceTopicBankRefresh`, `allowStubFallback`: optional — SEO topic bank controls
 * - `useDailyPublishingBrief`, `useDailyProductionTracker`, `contentSubcategory`: optional — **Publishing**
 *
 * `useHandoff` and `publishToSite` cannot both be true (would double-emit queue events).
 */
export async function POST(request: Request) {
  if (!authorizeAgenticRun(request)) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Send Authorization: Bearer <AGENTIC_RUN_TOKEN> or the same ingest secret (INGEST_PASSWORD) when AGENTIC_RUN_TOKEN is unset.",
      },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deptRaw = typeof body["department"] === "string" ? body["department"].trim() : "";
  if (!isDeptId(deptRaw)) {
    return NextResponse.json(
      { error: "department must be marketing | publishing | seo" },
      { status: 400 },
    );
  }

  const task = typeof body["task"] === "string" ? body["task"].trim() : "";
  if (!task) {
    return NextResponse.json({ error: "task is required" }, { status: 400 });
  }

  const keyword =
    typeof body["keyword"] === "string" && body["keyword"].trim()
      ? body["keyword"].trim()
      : undefined;
  const useHandoff = body["useHandoff"] === true;
  const skipUpstreamCheck = body["skipUpstreamCheck"] === true;
  const publishExplicit = body["publishToSite"];
  const publishExplicitTrue = publishExplicit === true;
  const publishExplicitFalse = publishExplicit === false;
  const autoPublishToSite =
    process.env["AGENTIC_AUTO_PUBLISH_TO_SITE"]?.trim().toLowerCase() === "true" &&
    deptRaw === "publishing" &&
    !useHandoff;
  const publishToSite =
    publishExplicitTrue || (!publishExplicitFalse && autoPublishToSite);
  const skipChiefEnrich = body["skipChiefEnrich"] === true;
  const referenceUrl =
    typeof body["referenceUrl"] === "string" && body["referenceUrl"].trim()
      ? body["referenceUrl"].trim()
      : undefined;
  const skipPhase7Fetch = body["skipPhase7Fetch"] === true;
  const useTopicBank = body["useTopicBank"] === true;
  const forceTopicBankRefresh = body["forceTopicBankRefresh"] === true;
  const allowStubFallback = body["allowStubFallback"] === true;
  const useDailyPublishingBrief = body["useDailyPublishingBrief"] === true;
  const useDailyProductionTracker = body["useDailyProductionTracker"] === true;
  const contentSubcategory =
    typeof body["contentSubcategory"] === "string" && body["contentSubcategory"].trim()
      ? body["contentSubcategory"].trim()
      : undefined;

  if (useTopicBank && deptRaw !== "seo") {
    return NextResponse.json(
      { error: "useTopicBank is only valid for department seo" },
      { status: 400 },
    );
  }
  if (
    (useDailyPublishingBrief || useDailyProductionTracker || !!contentSubcategory) &&
    deptRaw !== "publishing"
  ) {
    return NextResponse.json(
      {
        error:
          "useDailyPublishingBrief, useDailyProductionTracker, and contentSubcategory are only valid for department publishing",
      },
      { status: 400 },
    );
  }

  if (useHandoff && publishToSite) {
    return NextResponse.json(
      {
        error:
          "Cannot combine useHandoff and publishToSite in one request. Run handoff first, then call again with publishToSite only.",
      },
      { status: 400 },
    );
  }

  if (publishToSite && deptRaw !== "publishing") {
    return NextResponse.json(
      { error: "publishToSite is only valid for department publishing" },
      { status: 400 },
    );
  }

  const input: DepartmentPipelineInput = {
    task,
    keyword,
    skipChiefEnrich,
    skipUpstreamCheck: useHandoff ? skipUpstreamCheck : undefined,
    referenceUrl,
    skipPhase7Fetch,
    useTopicBank: useTopicBank || undefined,
    forceTopicBankRefresh: forceTopicBankRefresh || undefined,
    allowStubFallback: allowStubFallback || undefined,
    useDailyPublishingBrief: useDailyPublishingBrief || undefined,
    useDailyProductionTracker: useDailyProductionTracker || undefined,
    contentSubcategory,
  };

  const cwd = process.cwd();

  let result: DepartmentPipelineResult | WaitingResult;
  if (deptRaw === "marketing") {
    result = useHandoff
      ? await runMarketingPipelineWithHandoff(input, cwd)
      : await runMarketingPipeline(input);
  } else if (deptRaw === "publishing") {
    result = useHandoff
      ? await runPublishingPipelineWithHandoff(input, cwd)
      : await runPublishingPipeline(input);
  } else {
    result = useHandoff
      ? await runSeoPipelineWithHandoff(input, cwd)
      : await runSeoPipeline(input);
  }

  if (isWaitingResult(result)) {
    return NextResponse.json(
      { ok: true, department: deptRaw, result },
      { status: 200 },
    );
  }

  if (isBlockedResult(result)) {
    return NextResponse.json(
      { ok: false, blocked: true, department: deptRaw, reason: result.reason },
      { status: 200 },
    );
  }

  const base = { ok: true as const, department: deptRaw, result };

  if (publishToSite && result.status === "approved") {
    const titleOverride =
      typeof body["articleTitle"] === "string" && body["articleTitle"].trim()
        ? body["articleTitle"].trim()
        : null;
    const slugOverride =
      typeof body["articleSlug"] === "string" && body["articleSlug"].trim()
        ? body["articleSlug"].trim()
        : undefined;

    const site = await sitePublishFromApprovedPublishingRun({
      cwd,
      task,
      keyword,
      contentSubcategory,
      articleTitle: titleOverride,
      articleSlug: slugOverride,
      result,
    });

    if (!site.ok) {
      return NextResponse.json(
        { ok: false, department: deptRaw, result, publish: { ok: false, error: site.error } },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ...base,
        publish: {
          ok: true as const,
          slug: site.data.slug,
          path: site.data.path,
          zernio: site.data.zernio,
        },
      },
      { status: 200 },
    );
  }

  return NextResponse.json(base, { status: 200 });
}
