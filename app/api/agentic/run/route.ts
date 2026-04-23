import { NextResponse } from "next/server";
import {
  extractMarkdownTitle,
  publishAgenticArticle,
} from "@/lib/agenticArticlePublish";
import { extractIngestBearerToken, getSharedIngestSecret } from "@/lib/ingestAuth";
import { runMarketingPipeline } from "@/xalura-agentic/departments/marketing";
import { runPublishingPipeline } from "@/xalura-agentic/departments/publishing";
import { runSeoPipeline } from "@/xalura-agentic/departments/seo";
import type { DepartmentId } from "@/xalura-agentic/engine/departments";
import { appendEvent } from "@/xalura-agentic/lib/eventQueue";
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
 * - `publishToSite`: optional — **Publishing only**: upsert `articles` in Supabase (requires service role env)
 * - `articleTitle`, `articleSlug`: optional overrides when publishing
 * - `skipChiefEnrich`: optional — skip live Chief append after a 10-cycle audit
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
  const publishToSite = body["publishToSite"] === true;
  const skipChiefEnrich = body["skipChiefEnrich"] === true;

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
    const title =
      titleOverride ||
      extractMarkdownTitle(result.workerOutput) ||
      task.slice(0, 120);

    const pub = await publishAgenticArticle({
      title,
      body: result.workerOutput,
      slug: slugOverride,
      author: "Xalura Agentic",
    });

    if (!pub.ok) {
      return NextResponse.json(
        { ok: false, department: deptRaw, result, publish: { ok: false, error: pub.error } },
        { status: 502 },
      );
    }

    appendEvent(
      {
        type: "ARTICLE_PUBLISHED",
        payload: {
          article_id: pub.slug,
          title,
          url: `/articles/${pub.slug}`,
        },
      },
      cwd,
    );

    return NextResponse.json(
      {
        ...base,
        publish: { ok: true as const, slug: pub.slug, path: `/articles/${pub.slug}` },
      },
      { status: 200 },
    );
  }

  return NextResponse.json(base, { status: 200 });
}
