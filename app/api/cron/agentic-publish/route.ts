import { NextResponse } from "next/server";
import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";
import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { runPublishingPipeline } from "@/xalura-agentic/departments/publishing";
import { scheduleArticlePipelineNotPublishedReport } from "@/xalura-agentic/lib/chiefPublishOutcomeReport";
import type { DepartmentPipelineInput } from "@/xalura-agentic/lib/runDepartmentPipeline";

export const dynamic = "force-dynamic";

function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * Secured publishing run for **Cloudflare cron** (or any caller with `AGENTIC_CRON_SECRET`).
 * Same outcome as `POST /api/admin/agentic-publish`: publishing pipeline + site upsert when approved.
 *
 * Auth: `Authorization: Bearer <AGENTIC_CRON_SECRET>` (required; no fallback to run/ingest tokens).
 */
export async function POST(request: Request) {
  const expected = process.env["AGENTIC_CRON_SECRET"]?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "AGENTIC_CRON_SECRET is not configured on this deployment" },
      { status: 503 },
    );
  }

  const token = extractBearer(request);
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let task =
    process.env["AGENTIC_CRON_PUBLISH_TASK"]?.trim() || AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body["task"] === "string" && body["task"].trim()) {
      task = body["task"].trim();
    }
  } catch {
    /* empty body → env or default task */
  }

  const cwd = process.cwd();
  const input: DepartmentPipelineInput = { task, cwd };
  const result = await runPublishingPipeline(input);

  if (result.status === "rejected") {
    scheduleArticlePipelineNotPublishedReport({
      cwd,
      task,
      result,
      source: "cron:agentic-publish",
    });
    return NextResponse.json(
      { ok: false, source: "cron", department: "publishing", result },
      { status: 200 },
    );
  }

  if (result.status === "error") {
    scheduleArticlePipelineNotPublishedReport({
      cwd,
      task,
      result,
      source: "cron:agentic-publish",
    });
    return NextResponse.json(
      { ok: false, source: "cron", department: "publishing", result },
      { status: 502 },
    );
  }

  if (result.status !== "approved") {
    scheduleArticlePipelineNotPublishedReport({
      cwd,
      task,
      result,
      source: "cron:agentic-publish",
    });
    return NextResponse.json(
      { ok: false, source: "cron", department: "publishing", result },
      { status: 200 },
    );
  }

  const site = await sitePublishFromApprovedPublishingRun({
    cwd,
    task,
    result,
    articleTitle: null,
  });

  if (!site.ok) {
    return NextResponse.json(
      {
        ok: false,
        source: "cron",
        department: "publishing",
        result,
        publish: { ok: false, error: site.error },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "cron" as const,
    department: "publishing" as const,
    result,
    publish: {
      ok: true as const,
      slug: site.data.slug,
      path: site.data.path,
      zernio: site.data.zernio,
    },
  });
}
