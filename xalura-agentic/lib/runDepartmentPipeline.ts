import { runExecutive } from "../agents/executive";
import { runManager } from "../agents/manager";
import { runWorker } from "../agents/worker";
import {
  recordApproval,
  type RecordApprovalResult,
} from "../engine/cycleEngine";
import type { DepartmentId } from "../engine/departments";
import { executiveDisplayName } from "./agentNames";
import { enrichAuditWithChief } from "./chiefEnrichAudit";
import { getVerticalById } from "./contentWorkflow/contentVerticals";
import { getLatestEvent } from "./eventQueue";
import { parseManagerDecision } from "./managerDecision";
import { bumpArticleCompleted } from "./contentWorkflow/dailyProductionStore";
import { buildPublishingDailyBriefPrefix } from "./contentWorkflow/publishingBrief";
import type { TopicBankEntry } from "./contentWorkflow/types";
import { getNextTopic } from "./contentWorkflow/topicBank";
import { recordSubcategoryUsed } from "./contentWorkflow/topicRotationStore";
import { zernioListProfiles } from "./phase7Clients";
import { buildPhase7WorkerContext } from "./phase7PipelineContext";

const MAX_MANAGER_ROUNDS = 3;
const MAX_ESCALATION_PHASES = 2;

export type DepartmentPipelineInput = {
  task: string;
  keyword?: string;
  cycleLog?: string;
  cwd?: string;
  executiveName?: string;
  /** When true, skip live Chief append after a 10-cycle audit (faster tests). */
  skipChiefEnrich?: boolean;
  /** Handoff wrappers only — skip KEYWORD_READY / ARTICLE_PUBLISHED gates (local tests). */
  skipUpstreamCheck?: boolean;
  /** Optional page to scrape (Firecrawl) for Worker context — SEO, Publishing, or Marketing. */
  referenceUrl?: string;
  /** Skip Firecrawl / GSC fetches (faster tests). */
  skipPhase7Fetch?: boolean;
  /** SEO: pull next keyword from topic bank (SerpAPI + Firecrawl + Gemini rank). */
  useTopicBank?: boolean;
  /** SEO: bypass crawl cooldown and refresh bank (still respects crawl logic unless combined with bank rules). */
  forceTopicBankRefresh?: boolean;
  /** SEO: when APIs missing, seed a one-topic stub bank (local dev only). */
  allowStubFallback?: boolean;
  /** Publishing: prepend daily production brief to Worker task. */
  useDailyPublishingBrief?: boolean;
  /** Publishing: increment `state/daily-production.json` on approve. */
  useDailyProductionTracker?: boolean;
  /** Publishing: record subcategory for rotation file after approve. */
  contentSubcategory?: string;
  /**
   * SEO with `useTopicBank`: consume next unused topic in this vertical (`CONTENT_VERTICALS` id).
   * Publishing: optional override for lane focus; otherwise latest `KEYWORD_READY.vertical_id` is used.
   */
  contentVerticalId?: string;
};

export type ContentWorkflowHandoff = {
  topic_bank: true;
  keyword: string;
  content_type: "article" | "course";
  subcategory: string;
  source_urls: string[];
  vertical_id: string;
  vertical_label: string;
};

export type DepartmentPipelineResult =
  | {
      status: "approved";
      workerOutput: string;
      managerOutput: string;
      executiveSummary: string;
      cycle: RecordApprovalResult;
      managerAttempts: number;
      phase7?: {
        zernio:
          | { ok: true; profileCount: number }
          | { ok: false; error: string };
      };
      contentWorkflow?: ContentWorkflowHandoff;
    }
  | {
      status: "rejected";
      workerOutput: string;
      managerOutput: string;
      reason: string;
      managerAttempts: number;
    }
  | {
      status: "error";
      stage: "worker" | "manager" | "executive";
      message: string;
    }
  | {
      status: "discarded";
      workerOutput: string;
      managerOutputs: string[];
      executiveEscalation: string;
    }
  | {
      status: "rejected_after_escalation";
      workerOutput: string;
      managerOutputs: string[];
      executiveEscalation: string;
      reason: string;
    }
  | { status: "blocked"; reason: string };

/** Isolated Worker→Manager→Executive→Chief ladder per vertical (`seo` / `publishing` only). */
function resolveAgentLaneId(
  departmentId: DepartmentId,
  input: DepartmentPipelineInput,
  activeContentTopic: TopicBankEntry | undefined,
  cwd: string,
): string | undefined {
  if (departmentId === "marketing") return undefined;
  if (departmentId === "seo") {
    const fromTopic = activeContentTopic?.vertical_id?.trim();
    if (fromTopic) return fromTopic;
    return input.contentVerticalId?.trim();
  }
  if (departmentId === "publishing") {
    const explicit = input.contentVerticalId?.trim();
    if (explicit) return explicit;
    const ev = getLatestEvent("KEYWORD_READY", cwd);
    if (ev?.type === "KEYWORD_READY" && ev.payload.vertical_id?.trim()) {
      return ev.payload.vertical_id!.trim();
    }
    return undefined;
  }
  return undefined;
}

async function guardStep<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

function firstLineUpper(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim().toUpperCase() ?? "";
  return line.replace(/[^A-Z_]/g, "");
}

export type RunDepartmentPipelineConfig = {
  departmentId: DepartmentId;
  /** Prompt label, e.g. "Marketing", "Publishing", "SEO & Audit" */
  departmentLabel: string;
  /** Cycle log task type: Campaign | Article | Keyword | Audit */
  taskType: string;
  /** Short name for Executive prompt, e.g. "Marketing" */
  executiveStoreLabel: string;
  input: DepartmentPipelineInput;
};

/**
 * Worker → Manager (up to 3 rounds) → optional Executive escalation → Executive summary → `recordApproval`.
 * After a 10-cycle audit file is written, optionally appends live Chief AI (Gemini).
 */
export async function runDepartmentPipeline(
  config: RunDepartmentPipelineConfig,
): Promise<DepartmentPipelineResult> {
  const { departmentId, departmentLabel, taskType, executiveStoreLabel, input } =
    config;
  const cwd = input.cwd ?? process.cwd();
  const DEPT = departmentLabel;
  const execName =
    input.executiveName?.trim() ||
    executiveDisplayName(departmentId, cwd);

  let effectiveTask = input.task;
  let effectiveKeyword = input.keyword;
  let activeContentTopic: TopicBankEntry | undefined;

  let publishingVerticalLine = "";
  if (departmentId === "publishing") {
    const explicit = input.contentVerticalId?.trim();
    if (explicit) {
      const meta = getVerticalById(explicit);
      publishingVerticalLine = meta
        ? `You are the **Publishing Worker** for vertical **${meta.label}** (\`${meta.id}\`). Stay in this lane; angles: ${meta.exampleAngles}.\n\n`
        : `You are the **Publishing Worker** for vertical \`${explicit}\`.\n\n`;
    } else {
      const ev = getLatestEvent("KEYWORD_READY", cwd);
      if (ev?.type === "KEYWORD_READY") {
        const vid = ev.payload.vertical_id?.trim();
        const lbl = ev.payload.vertical_label?.trim();
        if (vid && lbl) {
          publishingVerticalLine = `You are the **Publishing Worker** for vertical **${lbl}** (\`${vid}\`) — **matched to the prior SEO handoff**. Align draft, metadata, and CTA with this lane only.\n\n`;
        }
      }
    }
  }

  if (departmentId === "seo" && input.useTopicBank) {
    const gate = await getNextTopic(cwd, {
      forceRefresh: input.forceTopicBankRefresh === true,
      allowStubFallback: input.allowStubFallback === true,
      verticalId: input.contentVerticalId,
    });
    if (!gate.ok) {
      return { status: "blocked", reason: gate.reason };
    }
    activeContentTopic = gate.topic;
    effectiveKeyword = gate.topic.keyword;
    const vLabel = gate.topic.vertical_label ?? gate.topic.vertical_id;
    const lines = [
      `You are the **SEO Worker** for vertical **${vLabel}** (\`${gate.topic.vertical_id}\`). Domain: **tech and AI only**; reject off-topic ideas.`,
      ``,
      `- Primary keyword: **${gate.topic.keyword}**`,
      `- Subcategory: ${gate.topic.subcategory}`,
    ];
    if (gate.topic.angle?.trim()) {
      lines.push(`- Editorial angle: ${gate.topic.angle.trim()}`);
    }
    lines.push(
      `- Planned content type: **${gate.topic.content_type}**`,
      `- Supporting keywords: ${gate.topic.supporting_keywords.join(", ") || "(none)"}`,
      `- Source URLs (reference): ${gate.topic.source_urls.join("\n") || "(none)"}`,
      ``,
      `## Department task`,
      input.task,
    );
    effectiveTask = lines.join("\n");
  }

  if (departmentId === "publishing") {
    effectiveTask = publishingVerticalLine + effectiveTask;
  }

  if (departmentId === "publishing" && input.useDailyPublishingBrief) {
    effectiveTask = buildPublishingDailyBriefPrefix(cwd) + effectiveTask;
  }

  const agentLaneId = resolveAgentLaneId(
    departmentId,
    input,
    activeContentTopic,
    cwd,
  );
  const agentLaneLabelMeta = agentLaneId
    ? getVerticalById(agentLaneId)?.label
    : undefined;

  let escalationPhase = 0;
  let managerOutputs: string[] = [];
  let totalManagerAttempts = 0;
  let lastWorkerOutput = "";

  while (escalationPhase < MAX_ESCALATION_PHASES) {
    let workerOutput = "";
    let rejectionReasons: string[] = [];

    for (let attempt = 0; attempt < MAX_MANAGER_ROUNDS; attempt++) {
      totalManagerAttempts += 1;
      const revisionHint =
        attempt > 0
          ? `\n\n## Manager feedback (revision ${attempt + 1})\n${rejectionReasons[rejectionReasons.length - 1]}`
          : "";
      const phaseHint =
        escalationPhase > 0
          ? `\n\n## Executive instruction\nThe Executive ordered a full rewrite. Start fresh; do not assume prior drafts were acceptable.`
          : "";

      const workerTask =
        escalationPhase === 0 && attempt === 0
          ? effectiveTask
          : `${effectiveTask}${phaseHint}${revisionHint}`;

      const phase7extras =
        escalationPhase === 0 && attempt === 0
          ? await buildPhase7WorkerContext({
              departmentId,
              referenceUrl: input.referenceUrl,
              skipPhase7Fetch: input.skipPhase7Fetch,
            })
          : {};
      const workerContextPieces: Record<string, unknown> = {};
      if (effectiveKeyword) workerContextPieces.keyword = effectiveKeyword;
      if (
        activeContentTopic &&
        departmentId === "seo" &&
        escalationPhase === 0 &&
        attempt === 0
      ) {
        workerContextPieces.content_topic = {
          keyword: activeContentTopic.keyword,
          subcategory: activeContentTopic.subcategory,
          content_type: activeContentTopic.content_type,
          vertical_id: activeContentTopic.vertical_id,
          vertical_label: activeContentTopic.vertical_label,
          angle: activeContentTopic.angle,
          supporting_keywords: activeContentTopic.supporting_keywords,
          source_urls: activeContentTopic.source_urls,
        };
      }
      if (escalationPhase === 0 && attempt === 0) {
        Object.assign(workerContextPieces, phase7extras);
      }
      const workerContext =
        Object.keys(workerContextPieces).length > 0
          ? workerContextPieces
          : undefined;

      const w = await guardStep(() =>
        runWorker({
          role: "Worker",
          department: DEPT,
          task: workerTask,
          context: workerContext,
          cycleLog: input.cycleLog,
        }),
      );
      if (!w.ok) {
        return { status: "error", stage: "worker", message: w.message };
      }
      workerOutput = w.value;
      lastWorkerOutput = workerOutput;

      const managerTask = `Review the Worker output below.
First line MUST be exactly APPROVED or REJECTED.
Following lines: your reason (quality, brand, alignment with ${departmentLabel} goals).

---
${workerOutput}`;

      const m = await guardStep(() =>
        runManager({
          role: "Manager",
          department: DEPT,
          task: managerTask,
          context: workerOutput,
        }),
      );
      if (!m.ok) {
        return { status: "error", stage: "manager", message: m.message };
      }
      const managerOutput = m.value;
      managerOutputs.push(managerOutput);

      const decision = parseManagerDecision(managerOutput);
      if (decision.approved) {
        const laneExecHint =
          agentLaneId && (departmentId === "seo" || departmentId === "publishing")
            ? ` This approval is for **vertical agent lane** \`${agentLaneId}\`${agentLaneLabelMeta ? ` (${agentLaneLabelMeta})` : ""} — an isolated ladder (own cycle files toward Chief).`
            : "";
        const e = await guardStep(() =>
          runExecutive({
            role: "Executive",
            department: DEPT,
            task: `Manager APPROVED this Worker output. Write a short executive summary (3–6 sentences) of what is being stored for the ${executiveStoreLabel} department.${laneExecHint}`,
            context: { workerOutput, managerReview: managerOutput },
          }),
        );
        if (!e.ok) {
          return { status: "error", stage: "executive", message: e.message };
        }
        const executiveSummary = e.value;

        const cycle = recordApproval(
          {
            department: departmentId,
            taskType,
            inputSummary: effectiveKeyword
              ? `Keyword: ${effectiveKeyword}\n\nTask:\n${effectiveTask.slice(0, 4000)}`
              : effectiveTask.slice(0, 8000),
            outputSummary: workerOutput.slice(0, 12000),
            managerApproved: true,
            managerReason: decision.reason,
            executiveName: execName,
            agentLaneId,
          },
          cwd,
        );

        let phase7:
          | {
              zernio:
                | { ok: true; profileCount: number }
                | { ok: false; error: string };
            }
          | undefined;
        if (departmentId === "marketing") {
          const z = await zernioListProfiles();
          phase7 = {
            zernio: z.error
              ? { ok: false, error: z.error }
              : { ok: true, profileCount: z.profiles?.length ?? 0 },
          };
        }

        if (departmentId === "publishing" && input.useDailyProductionTracker) {
          bumpArticleCompleted(
            cwd,
            effectiveKeyword || workerOutput.slice(0, 120),
          );
        }
        if (departmentId === "publishing" && input.contentSubcategory?.trim()) {
          recordSubcategoryUsed(cwd, input.contentSubcategory.trim());
        }

        if (
          cycle.auditTriggered &&
          cycle.auditFileRelative &&
          !input.skipChiefEnrich
        ) {
          await enrichAuditWithChief({
            department: departmentId,
            auditFileRelative: cycle.auditFileRelative,
            cwd,
            agentLaneKey:
              agentLaneId && (departmentId === "seo" || departmentId === "publishing")
                ? `${departmentId}:${agentLaneId}`
                : undefined,
            agentLaneHumanLabel: agentLaneLabelMeta,
          });
        }

        const contentWorkflow: ContentWorkflowHandoff | undefined =
          activeContentTopic && input.useTopicBank
            ? {
                topic_bank: true,
                keyword: activeContentTopic.keyword,
                content_type: activeContentTopic.content_type,
                subcategory: activeContentTopic.subcategory,
                source_urls: activeContentTopic.source_urls,
                vertical_id: activeContentTopic.vertical_id,
                vertical_label:
                  activeContentTopic.vertical_label ??
                  activeContentTopic.vertical_id,
              }
            : undefined;

        return {
          status: "approved",
          workerOutput,
          managerOutput,
          executiveSummary,
          cycle,
          managerAttempts: totalManagerAttempts,
          ...(phase7 ? { phase7 } : {}),
          ...(contentWorkflow ? { contentWorkflow } : {}),
        };
      }

      rejectionReasons.push(decision.reason);
    }

    const escTask = `The Manager rejected the Worker output **${MAX_MANAGER_ROUNDS}** times for **${DEPT}**.

Rejection reasons:
${rejectionReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Worker's last output:
---
${workerOutput.slice(0, 8000)}
---

**Your decision:** Reply with **first line exactly** \`REWRITE\` or \`DISCARD\` (one word, uppercase).
Then a short paragraph explaining why. If REWRITE, the Worker gets one more clean attempt. If DISCARD, the task ends with no cycle increment.`;

    const esc = await guardStep(() =>
      runExecutive({
        role: "Executive",
        department: DEPT,
        task: escTask,
        context: { workerOutput, rejectionReasons },
      }),
    );
    if (!esc.ok) {
      return { status: "error", stage: "executive", message: esc.message };
    }
    const executiveEscalation = esc.value;
    const head = firstLineUpper(executiveEscalation);

    if (head.startsWith("DISCARD")) {
      return {
        status: "discarded",
        workerOutput,
        managerOutputs,
        executiveEscalation,
      };
    }

    if (!head.startsWith("REWRITE")) {
      return {
        status: "discarded",
        workerOutput,
        managerOutputs,
        executiveEscalation:
          executiveEscalation +
          "\n\n_(Executive did not issue REWRITE or DISCARD clearly — treating as DISCARD.)_",
      };
    }

    escalationPhase += 1;
  }

  return {
    status: "rejected_after_escalation",
    workerOutput: lastWorkerOutput,
    managerOutputs,
    executiveEscalation:
      "REWRITE was issued twice without approval — stopping to avoid an infinite loop.",
    reason: "Max executive-guided rewrite phases exhausted",
  };
}

