import { sitePublishFromApprovedPublishingRun } from "@/lib/agenticPublishingSite";
import { scheduleArticlePipelineNotPublishedReport } from "./chiefPublishOutcomeReport";
import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import { appendFailedOperation } from "./failedQueue";
import {
  buildKeywordReadyPayloadFromApprovedSeo,
  runPublishingPipelineWithHandoff,
  runSeoPipelineWithHandoff,
} from "./handoff";
import { readFileUtf8Agentic, writeFileUtf8Agentic, isAgenticDiskWritable } from "./agenticDisk";
import { getAgenticRoot } from "./paths";
import { getIncrementalSeoTask } from "./incrementalContentCron";
import { nextVerticalForHourlyTick } from "./incrementalCadenceStore";
import { incrementalBatchSizeFromEnv, shouldForceTopicBankForVertical } from "./contentWorkflow/topicBank";
import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";
import type { KeywordReadyPayload } from "./eventQueue";
import type { SeoPipelineResult } from "../departments/seo";
import type { PublishingPipelineResult } from "../departments/publishing";
import type { DepartmentPipelineResult } from "./runDepartmentPipeline";

const STATE = "incremental-stagger.json";
const FILE_KW = "incremental-stagger-keyword-ready.json";
const FILE_PUB = "incremental-stagger-publishing-approved.json";

type StaggerInner =
  | { v: 1; phase: "idle" }
  | {
      v: 1;
      phase: "awaiting_publishing" | "awaiting_site";
      vertical_id: string;
      vertical_label: string;
      cadence_tick: number;
    };

function statePath(cwd: string) {
  return `${getAgenticRoot(cwd)}/state/${STATE}`;
}
function pathKw(cwd: string) {
  return `${getAgenticRoot(cwd)}/state/${FILE_KW}`;
}
function pathPub(cwd: string) {
  return `${getAgenticRoot(cwd)}/state/${FILE_PUB}`;
}

function readState(cwd: string): StaggerInner {
  const p = statePath(cwd);
  const raw = readFileUtf8Agentic(p);
  if (!raw) return { v: 1, phase: "idle" };
  try {
    const j = JSON.parse(raw) as StaggerInner;
    if (j?.v === 1 && (j.phase === "idle" || j.phase === "awaiting_publishing" || j.phase === "awaiting_site")) {
      return j;
    }
  } catch {
    /* ignore */
  }
  return { v: 1, phase: "idle" };
}

function writeState(cwd: string, s: StaggerInner): void {
  if (!isAgenticDiskWritable()) return;
  writeFileUtf8Agentic(statePath(cwd), JSON.stringify(s, null, 2) + "\n");
}

function clearStaggerFilesSync(cwd: string): void {
  if (!isAgenticDiskWritable()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    for (const f of [pathKw(cwd), pathPub(cwd)]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
}

function staggerEnabled(): boolean {
  const t = (process.env["AGENTIC_INCREMENTAL_STAGGER"] ?? "").trim().toLowerCase();
  return t === "true" || t === "1";
}

function incrementPublishTask(): string {
  const t = process.env["AGENTIC_INCREMENTAL_PUBLISH_TASK"]?.trim();
  return t || AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK;
}

function autoSitePublish(): boolean {
  const a = process.env["AGENTIC_INCREMENTAL_AUTO_SITE_PUBLISH"]?.trim().toLowerCase();
  if (a === "false" || a === "0") return false;
  if (a === "true" || a === "1") return true;
  return process.env["AGENTIC_AUTO_PUBLISH_TO_SITE"]?.trim().toLowerCase() === "true";
}

function logStagger(
  department: "seo" | "publishing" | "marketing",
  stage: string,
  event: string,
  summary: string,
  detail?: Record<string, unknown>,
): void {
  fireAgenticPipelineLog({ department, stage, event, summary, detail, agentLaneId: null });
}

/**
 * **Multi-HTTP** incremental: each call advances at most one leg (SEO → later Publishing → later Site).
 * Schedule the same URL every ~15m inside a 2h window. Requires **writable** agentic `state/`.
 * Set `AGENTIC_INCREMENTAL_STAGGER=true`. Do not run the monolithic hourly tick on the same schedule,
 * or disable it — otherwise cadence can double-advance.
 */
export async function runIncrementalStaggerStep(
  cwd: string = process.cwd(),
  options?: { forceSitePublish?: boolean; awaitFounderOversight?: boolean; forceTopicBankIfMissing?: boolean },
): Promise<
  | { ok: true; step: "seo" | "publishing" | "site" | "idle"; detail?: string }
  | { ok: false; step: string; error: string }
> {
  if (!staggerEnabled()) {
    return { ok: true, step: "idle", detail: "AGENTIC_INCREMENTAL_STAGGER is not true — skipped." };
  }
  if (incrementalBatchSizeFromEnv() > 1) {
    return { ok: false, step: "config", error: "Stagger mode requires AGENTIC_INCREMENTAL_BATCH_SIZE=1" };
  }
  if (!isAgenticDiskWritable()) {
    return { ok: false, step: "disk", error: "Agentic state is not writable — stagger needs disk." };
  }

  const st = readState(cwd);

  if (st.phase === "awaiting_publishing") {
    const rawKw = readFileUtf8Agentic(pathKw(cwd));
    if (!rawKw) {
      writeState(cwd, { v: 1, phase: "idle" });
      return { ok: false, step: "publishing", error: "Missing keyword-ready file — reset stagger state" };
    }
    let keywordReady: KeywordReadyPayload;
    try {
      keywordReady = JSON.parse(rawKw) as KeywordReadyPayload;
    } catch (e) {
      writeState(cwd, { v: 1, phase: "idle" });
      clearStaggerFilesSync(cwd);
      return { ok: false, step: "publishing", error: `Bad keyword file: ${e instanceof Error ? e.message : e}` };
    }
    const pub = await runPublishingPipelineWithHandoff(
      {
        cwd,
        task: incrementPublishTask(),
        skipChiefEnrich: true,
        skipUpstreamCheck: true,
        keywordReady,
      },
      cwd,
    );
    if (pub.status === "waiting") {
      logStagger("publishing", "incremental_stagger", "waiting", pub.reason, { tick: st.cadence_tick });
      appendFailedOperation(
        { kind: "pipeline", message: `Stagger pub waiting: ${pub.reason}`, detail: "incremental_stagger" },
        cwd,
      );
      writeState(cwd, { v: 1, phase: "idle" });
      clearStaggerFilesSync(cwd);
      return { ok: false, step: "publishing", error: pub.reason };
    }
    if (pub.status !== "approved") {
      const reason =
        "reason" in pub && typeof pub.reason === "string" ? pub.reason : pub.status;
      scheduleArticlePipelineNotPublishedReport({
        cwd,
        task: `${incrementPublishTask()} (incremental_stagger)`,
        result: pub,
        source: "incremental:stagger_publishing",
      });
      logStagger("publishing", "incremental_stagger", String(pub.status), String(reason).slice(0, 500), {
        tick: st.cadence_tick,
      });
      writeState(cwd, { v: 1, phase: "idle" });
      clearStaggerFilesSync(cwd);
      return { ok: false, step: "publishing", error: reason };
    }
    writeFileUtf8Agentic(pathPub(cwd), JSON.stringify(pub));
    writeState(cwd, {
      v: 1,
      phase: "awaiting_site",
      vertical_id: st.vertical_id,
      vertical_label: st.vertical_label,
      cadence_tick: st.cadence_tick,
    });
    logStagger("publishing", "incremental_stagger", "approved", `Publishing approved — site step next. tick=${st.cadence_tick}`, {
      tick: st.cadence_tick,
    });
    return { ok: true, step: "publishing" };
  }

  if (st.phase === "awaiting_site") {
    const rawPub = readFileUtf8Agentic(pathPub(cwd));
    if (!rawPub) {
      writeState(cwd, { v: 1, phase: "idle" });
      return { ok: false, step: "site", error: "Missing publishing-approved file" };
    }
    let result: DepartmentPipelineResult;
    try {
      result = JSON.parse(rawPub) as DepartmentPipelineResult;
    } catch (e) {
      writeState(cwd, { v: 1, phase: "idle" });
      clearStaggerFilesSync(cwd);
      return { ok: false, step: "site", error: `Bad publishing json: ${e instanceof Error ? e.message : e}` };
    }
    if (result.status !== "approved") {
      writeState(cwd, { v: 1, phase: "idle" });
      clearStaggerFilesSync(cwd);
      return { ok: false, step: "site", error: "Stored publishing was not approved" };
    }
    const forceSite = options?.forceSitePublish === true || autoSitePublish();
    if (!forceSite) {
      logStagger("publishing", "incremental_stagger", "site_skipped", "Auto site publish off — stagger cycle complete at publishing.", {
        tick: st.cadence_tick,
      });
      writeState(cwd, { v: 1, phase: "idle" });
      clearStaggerFilesSync(cwd);
      return { ok: true, step: "site", detail: "no_site" };
    }
    const site = await sitePublishFromApprovedPublishingRun(
      {
        cwd,
        task: incrementPublishTask(),
        keyword: result.contentWorkflow?.keyword,
        contentSubcategory: result.contentWorkflow?.subcategory,
        articleTitle: null,
        result: result as Extract<DepartmentPipelineResult, { status: "approved" }>,
      },
      { awaitFounderOversight: options?.awaitFounderOversight },
    );
    if (!site.ok) {
      logStagger("publishing", "incremental_stagger", "site_error", site.error, { tick: st.cadence_tick });
      appendFailedOperation({ kind: "pipeline", message: `Stagger site: ${site.error}`, detail: "incremental_stagger" }, cwd);
    } else {
      logStagger("publishing", "incremental_stagger", "site_published", `Live: ${site.data.path}`, {
        tick: st.cadence_tick,
        slug: site.data.slug,
      });
    }
    writeState(cwd, { v: 1, phase: "idle" });
    clearStaggerFilesSync(cwd);
    return site.ok
      ? { ok: true, step: "site" }
      : { ok: false, step: "site", error: site.error };
  }

  const tickMeta = nextVerticalForHourlyTick(cwd);
  const forceTopicBankRefresh =
    options?.forceTopicBankIfMissing === true && (await shouldForceTopicBankForVertical(cwd, tickMeta.vertical_id));
  const seo = await runSeoPipelineWithHandoff(
    {
      cwd,
      task: getIncrementalSeoTask(),
      useTopicBank: true,
      contentVerticalId: tickMeta.vertical_id,
      allowStubFallback: false,
      forceTopicBankRefresh,
      skipChiefEnrich: true,
    },
    cwd,
  );
  if (seo.status !== "approved") {
    const s = seo as Exclude<SeoPipelineResult, { status: "approved" }>;
    logStagger("seo", "incremental_stagger", s.status, JSON.stringify(s).slice(0, 800), { tick: tickMeta.tick });
    appendFailedOperation(
      { kind: "pipeline", message: `Stagger SEO ${s.status}`, detail: `tick=${tickMeta.tick}` },
      cwd,
    );
    return { ok: false, step: "seo", error: s.status === "blocked" ? s.reason : s.status };
  }
  const keywordReady = buildKeywordReadyPayloadFromApprovedSeo(seo, seo.contentWorkflow?.keyword);
  writeFileUtf8Agentic(pathKw(cwd), JSON.stringify(keywordReady, null, 2));
  writeState(cwd, {
    v: 1,
    phase: "awaiting_publishing",
    vertical_id: tickMeta.vertical_id,
    vertical_label: tickMeta.vertical_label,
    cadence_tick: tickMeta.tick,
  });
  logStagger("seo", "incremental_stagger", "seo_approved", `Keyword passed to next stagger step (publishing). tick=${tickMeta.tick} kw=${(keywordReady.keywords[0] ?? "").slice(0, 80)}`, {
    tick: tickMeta.tick,
    vertical_id: tickMeta.vertical_id,
  });
  return { ok: true, step: "seo" };
}

/** Remove stagger files + idle state (admin recovery). */
export function resetIncrementalStagger(cwd: string): void {
  clearStaggerFilesSync(cwd);
  writeState(cwd, { v: 1, phase: "idle" });
}
