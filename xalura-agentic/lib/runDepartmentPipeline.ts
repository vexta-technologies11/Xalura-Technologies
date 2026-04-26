import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import {
  agentLaneIdForArticleSubcategory,
  articleSubcategoryTitleForAgentLaneId,
} from "@/lib/articleSubcategoryAgentLanes";
import { runExecutive } from "../agents/executive";
import { runManager } from "../agents/manager";
import { runWorker } from "../agents/worker";
import {
  recordApproval,
  type RecordApprovalResult,
} from "../engine/cycleEngine";
import type { DepartmentId } from "../engine/departments";
import {
  executiveDisplayName,
  getExecutiveAssignedName,
  getWorkerAssignedNameForLane,
  loadAgentNamesConfig,
} from "./agentNames";
import { enrichAuditWithChief } from "./chiefEnrichAudit";
import {
  formatStrategyNoteForManager,
  formatStrategyPreamble,
  loadStrategyOverlay,
} from "./auditStrategyOverlayStore";
import type { AuditStrategyOverlayV1 } from "./auditStrategyOverlayStore";
import { getVerticalById } from "./contentWorkflow/contentVerticals";
import { getLatestEvent, type KeywordReadyPayload } from "./eventQueue";
import { parseManagerDecision } from "./managerDecision";
import { bumpArticleCompleted } from "./contentWorkflow/dailyProductionStore";
import { buildPublishingDailyBriefPrefix } from "./contentWorkflow/publishingBrief";
import type { TopicBankEntry } from "./contentWorkflow/types";
import { getNextTopic } from "./contentWorkflow/topicBank";
import { recordSubcategoryUsed } from "./contentWorkflow/topicRotationStore";
import { zernioListProfiles } from "./phase7Clients";
import { buildPhase7WorkerContext } from "./phase7PipelineContext";
import {
  buildSeoTopicResearchContext,
  mergePhase7Extras,
} from "./seoTopicResearchContext";
import { buildPublishingHandoffProtocolBlock } from "./contentWorkflow/xaluraContentProtocol";

const MAX_MANAGER_ROUNDS = 3;
const MAX_ESCALATION_PHASES = 2;

function formatPublishingKeywordHandoffBlock(p: KeywordReadyPayload): string {
  const kw = (p.keywords[0] ?? "").trim();
  const lines: string[] = ["## SEO → Publishing handoff (mandatory)"];
  if (p.topic_id?.trim()) {
    lines.push(`- **Topic id:** \`${p.topic_id.trim()}\` — do not mix with other topics.`);
  }
  if (kw) {
    lines.push(`- **Primary keyword:** ${kw}`);
  } else {
    lines.push(
      "- **Primary keyword:** (missing from handoff — output a single line explaining you cannot draft until SEO supplies a keyword.)",
    );
  }
  if (p.subcategory?.trim()) lines.push(`- **Subcategory:** ${p.subcategory.trim()}`);
  if (p.content_type) lines.push(`- **Content type:** ${p.content_type}`);
  if (p.vertical_label?.trim() || p.vertical_id?.trim()) {
    lines.push(
      `- **Vertical (theme):** ${(p.vertical_label ?? p.vertical_id)!.trim()} (\`${(p.vertical_id ?? "").trim() || "n/a"}\`)`,
    );
  }
  if (p.source_urls?.length) {
    lines.push("- **Source URLs** (ground claims here; do not invent a different pillar topic):");
    for (const u of p.source_urls) {
      if (u?.trim()) lines.push(`  - ${u.trim()}`);
    }
  }
  if (p.checklist?.length) {
    lines.push("", "## SEO quality checklist (mandatory — every item must be satisfied)");
    for (const item of p.checklist) {
      lines.push(`- ${item}`);
    }
  }
  lines.push(
    "",
    "### Editorial contract",
    "- The Markdown article must **center** the primary keyword in the `#` title, lede, and body.",
    "- Do **not** substitute a generic theme (e.g. a broad audience essay) unless it is a direct framing of that exact keyword.",
    "- The published body starts at `# Title` — no meta preamble (no \"As a Worker\", no department self-introduction).",
  );
  const protocolBlock = buildPublishingHandoffProtocolBlock(p.content_type);
  if (protocolBlock) {
    lines.push("", protocolBlock);
  }
  return `${lines.join("\n")}\n\n`;
}

function keywordReadyToContentWorkflow(
  p: KeywordReadyPayload,
): ContentWorkflowHandoff | undefined {
  const kw = (p.keywords[0] ?? "").trim();
  if (!kw) return undefined;
  return {
    topic_bank: true,
    topic_id: p.topic_id?.trim(),
    keyword: kw,
    content_type: p.content_type ?? "article",
    subcategory: p.subcategory?.trim() ?? "",
    source_urls: (p.source_urls ?? []).filter((u): u is string => Boolean(u?.trim())),
    vertical_id: p.vertical_id?.trim() ?? "",
    vertical_label: (p.vertical_label ?? p.vertical_id ?? "").trim(),
    checklist: p.checklist,
  };
}

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
  /** Skip optional fetches: `referenceUrl` Firecrawl, GSC (SEO), and per-topic SerpAPI + Firecrawl (SEO + `useTopicBank`). */
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
   * SEO without a `topicSnapshot`: prefer next unused topic in this vertical (`CONTENT_VERTICALS` id).
   * Publishing: optional theme override; **agent lane** id prefers `topic_id` from the handoff when present.
   */
  contentVerticalId?: string;
  /**
   * Publishing: use this handoff instead of the global latest `KEYWORD_READY` (required for parallel topics).
   */
  keywordReady?: KeywordReadyPayload;
  /**
   * SEO with `useTopicBank`: use this row instead of consuming the next from the bank (batch / parallel).
   */
  topicSnapshot?: TopicBankEntry;
};

export type ContentWorkflowHandoff = {
  topic_bank: true;
  topic_id?: string;
  keyword: string;
  content_type: "article" | "course";
  subcategory: string;
  source_urls: string[];
  vertical_id: string;
  vertical_label: string;
  /** From topic bank row (SEO path). */
  supporting_keywords?: string[];
  checklist?: string[];
};

export type DepartmentPipelineResult =
  | {
      status: "approved";
      workerOutput: string;
      managerOutput: string;
      executiveSummary: string;
      cycle: RecordApprovalResult;
      managerAttempts: number;
      /** Manager REJECTED reasons in the winning escalation phase, before the final APPROVE (if any). */
      managerRejectionHistory: string[];
      /** How many executive rewrite phases (0 = none) were used before approval. */
      escalationPhaseIndex: number;
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

/**
 * Isolated ladder (`seo` / `publishing` only): **content pillar** (one of 10 public
 * subcategory lane ids) when the topic/handoff has a matching label — SEO and Publishing
 * **share the same** `sc-…` id. Else topic id, else catalog `vertical_id` (legacy).
 */
function resolveAgentLaneId(
  departmentId: DepartmentId,
  input: DepartmentPipelineInput,
  activeContentTopic: TopicBankEntry | undefined,
  publishingKeywordReady: KeywordReadyPayload | null,
  cwd: string,
): string | undefined {
  if (departmentId === "marketing") return undefined;
  if (departmentId === "seo") {
    const fromPillar = agentLaneIdForArticleSubcategory(
      activeContentTopic?.subcategory,
    );
    if (fromPillar) return fromPillar;
    const fromTopic = activeContentTopic?.id?.trim();
    if (fromTopic) return fromTopic;
    return input.contentVerticalId?.trim();
  }
  if (departmentId === "publishing") {
    const evKw = getLatestEvent("KEYWORD_READY", cwd);
    const fromPillar = agentLaneIdForArticleSubcategory(
      publishingKeywordReady?.subcategory || input.keywordReady?.subcategory,
    );
    if (fromPillar) return fromPillar;
    if (evKw?.type === "KEYWORD_READY") {
      const pillar = agentLaneIdForArticleSubcategory(evKw.payload.subcategory);
      if (pillar) return pillar;
    }
    const fromHandoff =
      publishingKeywordReady?.topic_id?.trim() || input.keywordReady?.topic_id?.trim();
    if (fromHandoff) return fromHandoff;
    if (evKw?.type === "KEYWORD_READY" && evKw.payload.topic_id?.trim()) {
      return evKw.payload.topic_id!.trim();
    }
    const explicit = input.contentVerticalId?.trim();
    if (explicit) return explicit;
    const fromPayload = publishingKeywordReady?.vertical_id?.trim();
    if (fromPayload) return fromPayload;
    if (evKw?.type === "KEYWORD_READY" && evKw.payload.vertical_id?.trim()) {
      return evKw.payload.vertical_id!.trim();
    }
    return undefined;
  }
  return undefined;
}

function resolveAgentLaneHumanLabel(
  agentLaneId: string | undefined,
  activeContentTopic: TopicBankEntry | undefined,
  publishingKeywordReady: KeywordReadyPayload | null,
): string | undefined {
  if (!agentLaneId) return undefined;
  const pillarTitle = articleSubcategoryTitleForAgentLaneId(agentLaneId);
  if (pillarTitle) {
    return `Content pillar: ${pillarTitle}`;
  }
  const v = getVerticalById(agentLaneId);
  if (v) return v.label;
  if (activeContentTopic?.id === agentLaneId) {
    const k = activeContentTopic.keyword.trim();
    return `one article — “${k.length > 64 ? `${k.slice(0, 64)}…` : k}”`;
  }
  const tid = publishingKeywordReady?.topic_id?.trim();
  if (tid === agentLaneId && publishingKeywordReady) {
    const kw = (publishingKeywordReady.keywords[0] ?? "").trim();
    return kw
      ? `one article — “${kw.length > 64 ? `${kw.slice(0, 64)}…` : kw}”`
      : `one article (topic ${agentLaneId})`;
  }
  return `topic lane ${agentLaneId}`;
}

function buildSeoTaskFromTopicRow(topic: TopicBankEntry, task: string): string {
  const vLabel = topic.vertical_label ?? topic.vertical_id;
  const sub = topic.subcategory?.trim() ?? "";
  const pillarLane = agentLaneIdForArticleSubcategory(sub);
  const intro = pillarLane
    ? `You are the **SEO Worker** for the **${sub}** content pillar — one of **ten** fixed library columns. The **Publishing Worker** for this **same** pillar will draft the article from your handoff: one paired agent track per column (names TBD), independent of the other nine pillars. **Theme vertical:** **${vLabel}** (\`${topic.vertical_id}\`). Domain: **tech and AI only**; reject off-topic ideas.`
    : `You are the **SEO Worker** for vertical **${vLabel}** (\`${topic.vertical_id}\`). Domain: **tech and AI only**; reject off-topic ideas.`;
  const lines = [
    intro,
    ``,
    `- **Traceability:** topic id \`${topic.id}\` (topic bank).`,
    ``,
    `- Primary keyword: **${topic.keyword}**`,
    `- Subcategory: ${topic.subcategory}`,
  ];
  if (topic.angle?.trim()) {
    lines.push(`- Editorial angle: ${topic.angle.trim()}`);
  }
  lines.push(
    `- Planned content type: **${topic.content_type}**`,
    `- Supporting keywords: ${topic.supporting_keywords.join(", ") || "(none)"}`,
    `- Source URLs (reference): ${topic.source_urls.join("\n") || "(none)"}`,
    ``,
    `## Department task`,
    task,
  );
  return lines.join("\n");
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
  const nameCfg = loadAgentNamesConfig(cwd);
  const dn = nameCfg.departments[departmentId]!;
  const managerAssigned = dn.manager.name?.trim() || undefined;
  const executiveAssigned = getExecutiveAssignedName(departmentId, cwd, input.executiveName);

  let effectiveTask = input.task;
  let effectiveKeyword = input.keyword;
  let activeContentTopic: TopicBankEntry | undefined;
  let publishingKeywordReady: KeywordReadyPayload | null = null;

  let publishingVerticalLine = "";
  if (departmentId === "publishing") {
    if (input.keywordReady) {
      publishingKeywordReady = input.keywordReady;
    } else {
      const evKw = getLatestEvent("KEYWORD_READY", cwd);
      if (evKw?.type === "KEYWORD_READY") {
        publishingKeywordReady = evKw.payload;
      }
    }
    const explicit = input.contentVerticalId?.trim();
    if (explicit) {
      const topicIdOverride = publishingKeywordReady?.topic_id?.trim();
      if (topicIdOverride) {
        publishingVerticalLine = `You are the **Publishing Worker** for the **same article** as SEO (topic id \`${topicIdOverride}\`). Reuse the SEO voice — one byline, one narrative (author names TBD).\n\n`;
      }
      const meta = getVerticalById(explicit);
      publishingVerticalLine += meta
        ? `You are the **Publishing Worker** for vertical **${meta.label}** (\`${meta.id}\`). Stay in this lane; angles: ${meta.exampleAngles}.\n\n`
        : `You are the **Publishing Worker** for vertical \`${explicit}\`.\n\n`;
      const hv = publishingKeywordReady?.vertical_id?.trim();
      if (hv && hv !== explicit) {
        publishingVerticalLine += `Note: latest SEO handoff vertical is \`${hv}\` — still obey the **keyword** in the handoff block below; escalate only if irreconcilable.\n\n`;
      }
    } else if (publishingKeywordReady) {
      const topicId = publishingKeywordReady.topic_id?.trim();
      if (topicId) {
        publishingVerticalLine = `You are the **Publishing Worker** for the **same article** as SEO (topic id \`${topicId}\`). Reuse the SEO voice and promises — one byline, one narrative (author names TBD). Theme vertical still applies below.\n\n`;
      }
      const vid = publishingKeywordReady.vertical_id?.trim();
      const lbl = publishingKeywordReady.vertical_label?.trim();
      if (vid && lbl) {
        publishingVerticalLine += `You are the **Publishing Worker** for vertical **${lbl}** (\`${vid}\`) — **matched to the prior SEO handoff**. Align draft, metadata, and CTA with this lane only.\n\n`;
      } else if (topicId && !vid) {
        publishingVerticalLine += `Match the handoff block below; stay consistent with the SEO Worker's framing.\n\n`;
      }
    }

    const pubSub = publishingKeywordReady?.subcategory?.trim();
    const publishingPillarIntro =
      pubSub && agentLaneIdForArticleSubcategory(pubSub)
        ? `You are the **Publishing Worker** for the **${pubSub}** content pillar — **the same** named column as the SEO Worker who produced this handoff (one of ten independent SEO↔Publishing pairs; each pillar has its own cycle logs toward Chief).\n\n`
        : "";

    const kwFromHandoff = publishingKeywordReady?.keywords[0]?.trim();
    if (kwFromHandoff) {
      effectiveKeyword = kwFromHandoff;
    }
    const handoffBlock = publishingKeywordReady
      ? formatPublishingKeywordHandoffBlock(publishingKeywordReady)
      : "";
    effectiveTask =
      publishingPillarIntro + publishingVerticalLine + handoffBlock + input.task;
  }

  if (departmentId === "seo" && input.useTopicBank) {
    if (input.topicSnapshot) {
      activeContentTopic = input.topicSnapshot;
      effectiveKeyword = input.topicSnapshot.keyword;
      effectiveTask = buildSeoTaskFromTopicRow(input.topicSnapshot, input.task);
    } else {
      const gate = await getNextTopic(cwd, {
        forceRefresh: input.forceTopicBankRefresh === true,
        allowStubFallback: input.allowStubFallback === true,
        verticalId: input.contentVerticalId,
      });
      if (!gate.ok) {
        fireAgenticPipelineLog({
          department: departmentId,
          agentLaneId: input.contentVerticalId?.trim() ?? null,
          stage: "topic_gate",
          event: "blocked",
          summary: gate.reason.slice(0, 500),
        });
        return { status: "blocked", reason: gate.reason };
      }
      activeContentTopic = gate.topic;
      effectiveKeyword = gate.topic.keyword;
      effectiveTask = buildSeoTaskFromTopicRow(gate.topic, input.task);
    }
  }

  if (departmentId === "publishing" && input.useDailyPublishingBrief) {
    effectiveTask = buildPublishingDailyBriefPrefix(cwd) + effectiveTask;
  }

  const agentLaneId = resolveAgentLaneId(
    departmentId,
    input,
    activeContentTopic,
    publishingKeywordReady,
    cwd,
  );
  const agentLaneLabelMeta = resolveAgentLaneHumanLabel(
    agentLaneId,
    activeContentTopic,
    publishingKeywordReady,
  );

  const plog = (
    stage: string,
    event: string,
    summary: string,
    detail?: Record<string, unknown>,
  ) => {
    fireAgenticPipelineLog({
      department: departmentId,
      agentLaneId,
      stage,
      event,
      summary,
      detail,
    });
  };

  const workerAssigned =
    getWorkerAssignedNameForLane(departmentId, agentLaneId, dn) || undefined;

  const strategyOverlay: AuditStrategyOverlayV1 | null = loadStrategyOverlay(
    cwd,
    departmentId,
    agentLaneId,
  );
  const strategyPreamble = formatStrategyPreamble(departmentId, strategyOverlay);
  const strategyManagerNote = formatStrategyNoteForManager(strategyOverlay);

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

      const workerTaskCore =
        escalationPhase === 0 && attempt === 0
          ? effectiveTask
          : `${effectiveTask}${phaseHint}${revisionHint}`;
      const workerTask = `${strategyPreamble}${workerTaskCore}`;

      let phase7extras: Record<string, unknown> = {};
      if (escalationPhase === 0 && attempt === 0) {
        phase7extras = await buildPhase7WorkerContext({
          departmentId,
          referenceUrl: input.referenceUrl,
          skipPhase7Fetch: input.skipPhase7Fetch,
        });
        if (
          departmentId === "seo" &&
          activeContentTopic &&
          input.useTopicBank &&
          !input.skipPhase7Fetch
        ) {
          const topicResearch = await buildSeoTopicResearchContext({
            keyword: activeContentTopic.keyword,
            subcategory: activeContentTopic.subcategory,
            verticalId: activeContentTopic.vertical_id,
            verticalLabel: activeContentTopic.vertical_label,
            skipPhase7Fetch: false,
            strategyOverlay: strategyOverlay ?? undefined,
          });
          phase7extras = mergePhase7Extras(phase7extras, topicResearch);
        }
      }
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
      if (
        publishingKeywordReady &&
        departmentId === "publishing" &&
        escalationPhase === 0 &&
        attempt === 0
      ) {
        workerContextPieces.keyword_ready = publishingKeywordReady;
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
          assignedName: workerAssigned,
        }),
      );
      if (!w.ok) {
        plog("worker", "error", w.message.slice(0, 500));
        return { status: "error", stage: "worker", message: w.message };
      }
      workerOutput = w.value;
      lastWorkerOutput = workerOutput;
      plog(
        "worker",
        "completed",
        `Output ${workerOutput.length} chars; keyword: ${(effectiveKeyword ?? "—").slice(0, 100)}`,
        { output_chars: workerOutput.length, keyword: effectiveKeyword ?? null },
      );

      const publishingManagerKw =
        departmentId === "publishing" ? (effectiveKeyword?.trim() ?? "") : "";
      const checklistGate =
        departmentId === "publishing" && publishingKeywordReady?.checklist?.length
          ? `

## Publishing Manager — 10-point checklist gate
Verify the Worker output against **each** item below. If **any** item is not clearly met, first line must be \`REJECTED\` and you must name the failed item(s) by number. There are no partial passes — only \`APPROVED\` if the piece is specific, expert-level, non-generic, and fully on-keyword.

${publishingKeywordReady.checklist!.map((c) => `${c}`).join("\n")}
`
          : "";
      const managerTask = publishingManagerKw
        ? `Review the Worker output below.
First line MUST be exactly APPROVED or REJECTED (strict — no other text on line 1).
The assignment fixed primary keyword **${publishingManagerKw}**. REJECT if the # title or body pivots to a different pillar (e.g. a generic audience theme) instead of materially serving that keyword and the SEO handoff.
REJECT if the writing is generic, shallow, repetitive, or “AI slop” tone. Reject if any SEO checklist item is not satisfied.
${checklistGate}
Following lines: your reason (quality, brand, handoff fidelity, checklist result).
${strategyManagerNote}

---
${workerOutput}`
        : `Review the Worker output below.
First line MUST be exactly APPROVED or REJECTED.
Following lines: your reason (quality, brand, alignment with ${departmentLabel} goals).
${strategyManagerNote}

---
${workerOutput}`;

      const m = await guardStep(() =>
        runManager({
          role: "Manager",
          department: DEPT,
          task: managerTask,
          context: workerOutput,
          assignedName: managerAssigned,
        }),
      );
      if (!m.ok) {
        plog("manager", "error", m.message.slice(0, 500));
        return { status: "error", stage: "manager", message: m.message };
      }
      const managerOutput = m.value;
      managerOutputs.push(managerOutput);

      const decision = parseManagerDecision(managerOutput, {
        strict: departmentId === "publishing",
      });
      if (decision.approved) {
        plog("manager", "approved", (decision.reason || "APPROVED").slice(0, 600), {
          round: totalManagerAttempts,
        });
        const laneExecHint =
          agentLaneId && (departmentId === "seo" || departmentId === "publishing")
            ? ` This approval is for **dedicated article agent lane** \`${agentLaneId}\`${agentLaneLabelMeta ? ` — ${agentLaneLabelMeta}` : ""} (isolated 10-approval window toward Chief).`
            : "";
        const e = await guardStep(() =>
          runExecutive({
            role: "Executive",
            department: DEPT,
            task: `Manager APPROVED this Worker output. Write a short executive summary (3–6 sentences) of what is being stored for the ${executiveStoreLabel} department.${laneExecHint}`,
            context:
              departmentId === "publishing" && publishingKeywordReady
                ? {
                    workerOutput,
                    managerReview: managerOutput,
                    keyword_ready: publishingKeywordReady,
                  }
                : { workerOutput, managerReview: managerOutput },
            assignedName: executiveAssigned,
          }),
        );
        if (!e.ok) {
          plog("executive", "error", e.message.slice(0, 500));
          return { status: "error", stage: "executive", message: e.message };
        }
        const executiveSummary = e.value;
        plog("executive", "completed", executiveSummary.slice(0, 600), {
          manager_rounds: totalManagerAttempts,
        });

        const cycle = await recordApproval(
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
        if (departmentId === "publishing") {
          const rotSub =
            input.contentSubcategory?.trim() ||
            publishingKeywordReady?.subcategory?.trim();
          if (rotSub) {
            recordSubcategoryUsed(cwd, rotSub);
          }
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
            strategyContext: {
              keyword: effectiveKeyword,
              subcategory: activeContentTopic?.subcategory ?? publishingKeywordReady?.subcategory,
              verticalLabel:
                activeContentTopic?.vertical_label?.trim() ||
                publishingKeywordReady?.vertical_label?.trim(),
            },
          });
        }

        const publishingHandoffCw =
          departmentId === "publishing" && publishingKeywordReady
            ? keywordReadyToContentWorkflow(publishingKeywordReady)
            : undefined;

        const contentWorkflow: ContentWorkflowHandoff | undefined =
          activeContentTopic && input.useTopicBank
            ? {
                topic_bank: true,
                topic_id: activeContentTopic.id,
                keyword: activeContentTopic.keyword,
                content_type: activeContentTopic.content_type,
                subcategory: activeContentTopic.subcategory,
                source_urls: activeContentTopic.source_urls,
                vertical_id: activeContentTopic.vertical_id,
                vertical_label:
                  activeContentTopic.vertical_label ??
                  activeContentTopic.vertical_id,
                supporting_keywords: activeContentTopic.supporting_keywords,
              }
            : publishingHandoffCw;

        plog("pipeline", "approved", "Run approved; cycle recorded", {
          audit: cycle.auditFileRelative ?? null,
          task_type: taskType,
        });

        return {
          status: "approved",
          workerOutput,
          managerOutput,
          executiveSummary,
          cycle,
          managerAttempts: totalManagerAttempts,
          managerRejectionHistory: [...rejectionReasons],
          escalationPhaseIndex: escalationPhase,
          ...(phase7 ? { phase7 } : {}),
          ...(contentWorkflow ? { contentWorkflow } : {}),
        };
      }

      plog("manager", "rejected", decision.reason.slice(0, 600), {
        round: totalManagerAttempts,
      });
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
        assignedName: executiveAssigned,
      }),
    );
    if (!esc.ok) {
      plog("executive", "error", esc.message.slice(0, 500));
      return { status: "error", stage: "executive", message: esc.message };
    }
    const executiveEscalation = esc.value;
    const head = firstLineUpper(executiveEscalation);

    if (head.startsWith("DISCARD")) {
      plog("pipeline", "discarded", "Executive DISCARD after manager rejections", {
        manager_rounds: totalManagerAttempts,
      });
      return {
        status: "discarded",
        workerOutput,
        managerOutputs,
        executiveEscalation,
      };
    }

    if (!head.startsWith("REWRITE")) {
      plog("pipeline", "discarded", "Executive unclear after manager rejections — treated as DISCARD", {
        manager_rounds: totalManagerAttempts,
      });
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

  plog("pipeline", "rejected", "REWRITE loop exhausted without manager approval", {
    manager_rounds: totalManagerAttempts,
  });
  return {
    status: "rejected_after_escalation",
    workerOutput: lastWorkerOutput,
    managerOutputs,
    executiveEscalation:
      "REWRITE was issued twice without approval — stopping to avoid an infinite loop.",
    reason: "Max executive-guided rewrite phases exhausted",
  };
}

