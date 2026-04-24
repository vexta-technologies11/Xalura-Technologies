import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { runMarketingPipeline } from "@/xalura-agentic/departments/marketing";
import { runPublishingPipeline } from "@/xalura-agentic/departments/publishing";
import { runSeoPipeline } from "@/xalura-agentic/departments/seo";
import {
  runMarketingPipelineWithHandoff,
  runPublishingPipelineWithHandoff,
  runSeoPipelineWithHandoff,
} from "@/xalura-agentic/lib/handoff";
import type { DepartmentPipelineInput, DepartmentPipelineResult } from "@/xalura-agentic/lib/runDepartmentPipeline";
import {
  readChiefStrategicDirectives,
  writeChiefStrategicDirectives,
} from "@/lib/chiefStrategicDirectives";
import type { ChiefInboundAction } from "@/lib/chiefInboundCommandParse";

function isWaiting(
  r: DepartmentPipelineResult | { status: "waiting" },
): r is { status: "waiting" } {
  return (r as { status?: string }).status === "waiting";
}

function isBlocked(
  r: DepartmentPipelineResult,
): r is Extract<DepartmentPipelineResult, { status: "blocked" }> {
  return r.status === "blocked";
}

function isApproved(
  r: DepartmentPipelineResult,
): r is Extract<DepartmentPipelineResult, { status: "approved" }> {
  return r.status === "approved";
}

export type ChiefExecuteReport =
  | { ok: true; text: string }
  | { ok: false; error: string; detail?: string };

/**
 * Run allowlisted, approve-gated mail actions (same work as `POST /api/agentic/run`).
 */
function withStrategicPreamble(cwd: string, task: string): string {
  const b = readChiefStrategicDirectives(cwd);
  if (!b.text.trim()) return task;
  return `## Strategic direction (founder)\n${b.text.slice(0, 4_000)}\n\n## Task\n${task}`;
}

export async function executeChiefInboundCommand(
  action: ChiefInboundAction,
  ctx: { cwd: string; fromEmail: string },
): Promise<ChiefExecuteReport> {
  const { cwd, fromEmail } = ctx;

  try {
    if (action.type === "set_strategic") {
      const w = writeChiefStrategicDirectives(cwd, { text: action.text, setBy: fromEmail });
      if (!w.ok) {
        return { ok: false, error: w.error, detail: "strategic" };
      }
      return {
        ok: true,
        text: `Strategic brief saved. It will be included in the next Chief operational snapshot for runs with disk access. Updated by ${fromEmail}.`,
      };
    }

    if (action.type === "run_seo") {
      const input: DepartmentPipelineInput = {
        task: withStrategicPreamble(cwd, action.task),
        cwd,
        useTopicBank: action.useTopicBank,
        contentVerticalId: action.contentVerticalId,
        skipPhase7Fetch: action.skipPhase7Fetch,
        keyword: action.keyword,
        forceTopicBankRefresh: action.forceTopicBankRefresh,
        allowStubFallback: action.allowStubFallback,
      };
      const result = action.useHandoff
        ? await runSeoPipelineWithHandoff(input, cwd)
        : await runSeoPipeline(input);
      if (isWaiting(result)) {
        return {
          ok: true,
          text: `SEO: waiting (handoff/gate) — check agentic state or run again. status=${(result as { status: string }).status ?? "waiting"}`,
        };
      }
      if (isBlocked(result)) {
        return {
          ok: true,
          text: `SEO: blocked — ${result.reason}\n(Worker/Manager/Executive may have gating.)`,
        };
      }
      if (isApproved(result)) {
        return {
          ok: true,
          text: `SEO: approved. Executive summary (truncated):\n${(result.executiveSummary ?? "").slice(0, 1_200)}`,
        };
      }
      if (result.status === "rejected") {
        return { ok: true, text: `SEO: rejected — ${result.reason}` };
      }
      return { ok: true, text: `SEO: status ${(result as { status: string }).status}` };
    }

    if (action.type === "run_marketing") {
      const input: DepartmentPipelineInput = {
        task: withStrategicPreamble(cwd, action.task),
        cwd,
        referenceUrl: action.referenceUrl,
      };
      const result = action.useHandoff
        ? await runMarketingPipelineWithHandoff(input, cwd)
        : await runMarketingPipeline(input);
      if (isWaiting(result)) {
        return {
          ok: true,
          text: "Marketing: waiting (handoff/gate).",
        };
      }
      if (isBlocked(result)) {
        return { ok: true, text: `Marketing: blocked — ${result.reason}` };
      }
      if (isApproved(result)) {
        return { ok: true, text: `Marketing: approved. Summary:\n${(result.executiveSummary ?? "").slice(0, 1_200)}` };
      }
      if (result.status === "rejected") {
        return { ok: true, text: `Marketing: rejected — ${result.reason}` };
      }
      return { ok: true, text: "Marketing: done" };
    }

    if (action.type === "run_publishing") {
      const input: DepartmentPipelineInput = {
        task: withStrategicPreamble(cwd, action.task),
        cwd,
        contentSubcategory: action.contentSubcategory,
        contentVerticalId: action.contentVerticalId,
        keyword: action.keyword,
      };
      const result = action.useHandoff
        ? await runPublishingPipelineWithHandoff(input, cwd)
        : await runPublishingPipeline(input);
      if (isWaiting(result)) {
        return { ok: true, text: "Publishing: waiting (handoff/gate)." };
      }
      if (isBlocked(result)) {
        return { ok: true, text: `Publishing: blocked — ${result.reason}` };
      }
      if (result.status === "rejected") {
        return { ok: true, text: `Publishing: rejected — ${result.reason}` };
      }
      if (!isApproved(result)) {
        return { ok: true, text: "Publishing: unexpected status" };
      }
      if (!action.publishToSite) {
        return {
          ok: true,
          text: `Publishing: approved (not published to site; set publish_to_site: true in command to upsert + publish). Summary:\n${(result.executiveSummary ?? "").slice(0, 1_200)}`,
        };
      }
      const site = await sitePublishFromApprovedPublishingRun({
        cwd,
        task: withStrategicPreamble(cwd, action.task),
        keyword: action.keyword,
        contentSubcategory: action.contentSubcategory,
        articleTitle: null,
        result,
      });
      if (!site.ok) {
        return { ok: false, error: site.error, detail: "publish" };
      }
      return {
        ok: true,
        text: `Published to site. slug=${site.data.slug} path=${site.data.path}\n(Executive view truncated) ${(result.executiveSummary ?? "").slice(0, 800)}`,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, detail: "exception" };
  }
  return { ok: false, error: "unknown action" };
}
