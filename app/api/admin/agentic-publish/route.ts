import { NextResponse } from "next/server";
import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";
import { createClient } from "@/lib/supabase/server";
import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { runPublishingPipeline } from "@/xalura-agentic/departments/publishing";
import type { DepartmentPipelineInput } from "@/xalura-agentic/lib/runDepartmentPipeline";

export const dynamic = "force-dynamic";

/**
 * Logged-in admin only. Runs **publishing** pipeline once and **publishToSite** when approved.
 * Same side effects as `POST /api/agentic/run` with publishing + publish (Zernio, Chief digest, etc.).
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let task = AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body["task"] === "string" && body["task"].trim()) {
      task = body["task"].trim();
    }
  } catch {
    /* empty body → default task */
  }

  const cwd = process.cwd();
  const input: DepartmentPipelineInput = { task, cwd };
  const result = await runPublishingPipeline(input);

  if (result.status === "rejected") {
    return NextResponse.json(
      { ok: false, department: "publishing", result },
      { status: 200 },
    );
  }

  if (result.status === "error") {
    return NextResponse.json(
      { ok: false, department: "publishing", result },
      { status: 502 },
    );
  }

  if (result.status !== "approved") {
    return NextResponse.json({ ok: false, department: "publishing", result }, { status: 200 });
  }

  const site = await sitePublishFromApprovedPublishingRun({
    cwd,
    task,
    result,
    articleTitle: null,
  });

  if (!site.ok) {
    return NextResponse.json(
      { ok: false, department: "publishing", result, publish: { ok: false, error: site.error } },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
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
