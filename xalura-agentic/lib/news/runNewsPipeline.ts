/**
 * News team orchestrator: Pre-Production (Serp+Firecrawl) → PreProd Manager →
 * Writers (W/M) → Chief of Audit (Executive) → Head of News log → Photographer → publish.
 */
import path from "path";
import { runExecutive } from "../../agents/executive";
import { runManager } from "../../agents/manager";
import { runWorker } from "../../agents/worker";
import { recordApproval } from "../../engine/cycleEngine";
import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import { insertNewsRunEvent } from "@/lib/newsRunEvents";
import {
  type NewsPublishPostEmailContext,
  sendHeadOfNewsPublishedEmailIfEnabled,
  sendNewsAuditorPublishedEmailIfEnabled,
} from "@/lib/newsAuditorPublishedEmail";
import { publishAgenticNews } from "@/lib/agenticNewsPublish";
import { uploadNewsCoverPng } from "@/lib/newsCoverStorage";
import { extractMarkdownTitle } from "@/lib/agenticArticlePublish";
import { serpApiSearch } from "../contentWorkflow/serpApiSearch";
import { loadAgentNamesConfig, getExecutiveAssignedName } from "../agentNames";
import { getAgenticRoot } from "../paths";
import { mkdirRecursiveAgentic, writeFileUtf8Agentic } from "../agenticDisk";
import { parseManagerDecision } from "../managerDecision";
import { resolveWorkerEnv } from "../resolveWorkerEnv";
import { generateHeroImage } from "../heroImageGenerate";
import { parseAuditorDecision } from "./auditorParse";
import {
  addFirecrawlExcerpts,
  gatherPreprodNewsPool,
  type GoogleNewsItem,
  fetchAiNewsChecklist30,
} from "./serpGoogleNews";

const MAX_PREPROD = 3;
const MAX_WRITER = 3;
const MAX_AUDIT_RETRIES = 2;

function intEnv(name: string, def: number): number {
  return Math.max(1, Math.min(50, parseInt(process.env[name] || String(def), 10) || def));
}

function newsWriterByline(cwd: string): string {
  const w = loadAgentNamesConfig(cwd).departments.news?.worker.name?.trim();
  return w || "Xalura News";
}

async function serpForAuditorLine(titleLine: string): Promise<string> {
  const s = await serpApiSearch(`${titleLine.slice(0, 200)}`, 5);
  if (s.error || !s.items?.length) {
    return `No Serp results: ${s.error || "empty"}`;
  }
  return s.items
    .map((i) => `- **${i.title}**\n  ${i.link}\n  ${i.snippet}`)
    .join("\n\n");
}

function poolJson(
  items: (GoogleNewsItem & { firecrawl_excerpt?: string })[],
): string {
  return items
    .map(
      (x, i) =>
        `### ${i + 1}. ${x.title}\n- **URL:** ${x.link}\n- **Excerpt:** ${(x.firecrawl_excerpt || x.snippet || "").slice(0, 400)}`,
    )
    .join("\n\n");
}

function checklistJson(items: GoogleNewsItem[]): string {
  return items
    .map(
      (x, i) =>
        `${i + 1}. ${x.title} — ${x.source || "?"} — ${x.link} — ${x.date || "?"}`,
    )
    .join("\n");
}

export type RunNewsPipelineResult =
  | { status: "published"; slug: string; runId: string; title: string }
  | { status: "error"; runId: string; message: string; stage: string }
  | { status: "aborted"; runId: string; reason: string; stage: string };

export type RunNewsPipelineInput = {
  topicHint?: string;
  cwd?: string;
  withImage?: boolean;
  publishToSite?: boolean;
};

export async function runNewsPipeline(
  input: RunNewsPipelineInput = {},
): Promise<RunNewsPipelineResult> {
  const cwd = input.cwd ?? process.cwd();
  const runId = `news-${Date.now()}`;
  const withImage = input.withImage !== false;
  const publishToSite = input.publishToSite !== false;
  const tz = (await resolveWorkerEnv("NEWS_SERP_TIMEZONE"))?.trim() || "UTC";
  const minPreprod = intEnv("NEWS_PREPROD_MIN", 20);
  const names = loadAgentNamesConfig(cwd);
  const ppn = names.departments.news_preprod;
  const nw = names.departments.news;
  const execIn =
    getExecutiveAssignedName("news", cwd) || "Chief of Audit";

  const logStage = (stage: string, summary: string, detail?: unknown) => {
    void insertNewsRunEvent(runId, stage, summary, detail);
    void fireAgenticPipelineLog({
      department: "news",
      stage,
      event: "news_pipeline",
      summary: `${runId}: ${summary}`.slice(0, 500),
      detail: { runId, ...(typeof detail === "object" && detail ? (detail as object) : {}) },
    });
  };

  const headPath = path.join(
    getAgenticRoot(cwd),
    "logs",
    "news",
    `head-${runId}.md`,
  );

  const digest: string[] = [`# Head of News run ${runId}`, ""];
  logStage("start", "Pipeline started", { timeZone: tz, minPreprod });

  let preprodPool: (GoogleNewsItem & { firecrawl_excerpt?: string })[] = [];
  let checklist: GoogleNewsItem[] = [];
  let draft = "";
  let title = "News update";
  /** For post-publish CEO email from Chief of Audit. */
  let lastAuditTextForEmail = "";
  /** Filled on successful pass — Head of News + Chief of Audit post-publish reports. */
  let postEmailContext: NewsPublishPostEmailContext | undefined;
  const executiveRounds: NewsPublishPostEmailContext["audit"]["executiveRounds"] = [];

  for (let auditAttempt = 0; auditAttempt < MAX_AUDIT_RETRIES; auditAttempt++) {
    let preprodRejects = 0;
    let preprodPassRound = 0;
    let writerRejects = 0;
    let writerPassRound = 0;

    if (auditAttempt > 0) {
      logStage("audit_retry", `Rebuilding Pre-Production (attempt ${auditAttempt + 1})`, {});
    }

    // ── Pre-Production: gather + W/M ──
    const poolRes = await gatherPreprodNewsPool({ minCount: minPreprod, timeZone: tz });
    if (!poolRes.ok) {
      return { status: "error", runId, message: poolRes.error, stage: "preprod_gather" };
    }
    preprodPool = await addFirecrawlExcerpts(poolRes.items, 8);
    digest.push(`- Gathered ${preprodPool.length} items.`, "");

    const ch = await fetchAiNewsChecklist30();
    if (!ch.ok) {
      return { status: "error", runId, message: ch.error, stage: "preprod_checklist" };
    }
    checklist = ch.items;
    digest.push(`- 30-item checklist loaded.`, "");

    let preWorkerOut = "";
    let preManagerFeedback = "";
    for (let r = 0; r < MAX_PREPROD; r++) {
      const wTask = `You are the **Pre-Production** staffer. We have **${preprodPool.length}** same-day real news items and a **30-item** AI news checklist. Pick **one** story the Writers should lead with. Output: (1) the **primary story URL** from the pool, (2) 2 short paragraphs: why it matters, and how it ties to the checklist.

## Pool
${poolJson(preprodPool)}

## 30-item checklist
${checklistJson(checklist)}

${preManagerFeedback ? `**Manager asked to fix:** ${preManagerFeedback}\n` : ""}
${input.topicHint?.trim() ? `**Hint:** ${input.topicHint.trim()}\n` : ""}`;

      preWorkerOut = await runWorker({
        task: wTask,
        role: "Worker",
        department: "News — Pre-Production",
        context: { kind: "news_preprod_worker", runId, round: r + 1 },
        assignedName: ppn.worker.name?.trim() || undefined,
      });
      logStage("preprod_worker", `round ${r + 1}`, { head: preWorkerOut.slice(0, 300) });

      const mOut = await runManager({
        task: `You are the **Pre-Production Manager**. Check relevance vs the 30-item checklist. First line: **APPROVED** or **REJECTED** with reason.

## Worker
${preWorkerOut}
`,
        role: "Manager",
        department: "News — Pre-Production (Manager)",
        context: { kind: "news_preprod_manager", runId, round: r + 1 },
        assignedName: ppn.manager.name?.trim() || undefined,
      });
      const mdec = parseManagerDecision(mOut, { strict: true });
      logStage("preprod_manager", mdec.approved ? "APPROVED" : "REJECTED", { reason: mdec.reason });
      if (mdec.approved) {
        preprodPassRound = r + 1;
        break;
      }
      preprodRejects += 1;
      preManagerFeedback = mdec.reason;
      if (r === MAX_PREPROD - 1) {
        return { status: "aborted", runId, reason: mdec.reason, stage: "preprod_manager" };
      }
    }

    const pickUrl = preprodPool[0]!.link;
    const packContext = preprodPool
      .slice(0, 5)
      .map(
        (p) =>
          `- [${p.title}](${p.link}) — ${(p.firecrawl_excerpt || p.snippet).slice(0, 160)}`,
      )
      .join("\n");

    // ── Writers ──
    let writerFeedback = "";
    for (let w = 0; w < MAX_WRITER; w++) {
      const t = `You are a **News Writer** (Xalura News). Draft a **factual, neutral** news post in Markdown. Start with \`# Title\`. 400–800 words. **Do not** invent events; ground in the **sources** below. Not marketing. Cite real URLs. Primary: **${pickUrl}**

## Source pack
${packContext}
${writerFeedback ? `\n**Manager revision:** ${writerFeedback}\n` : ""}`;

      draft = await runWorker({
        task: t,
        role: "Worker",
        department: "News — Writers",
        context: { kind: "news_writer", runId, round: w + 1 },
        assignedName: nw.worker.name?.trim() || undefined,
      });
      logStage("news_writer", `round ${w + 1}`, { head: draft.slice(0, 400) });

      const wMgr = await runManager({
        task: `You are the **Writer Manager**. First line: **APPROVED** or **REJECTED** with reason.

## Draft
${draft}
`,
        role: "Manager",
        department: "News — Writer Manager",
        context: { kind: "news_writer_manager", runId, round: w + 1 },
        assignedName: nw.manager.name?.trim() || undefined,
      });
      const wd = parseManagerDecision(wMgr, { strict: true });
      logStage("writer_manager", wd.approved ? "APPROVED" : "REJECTED", { reason: wd.reason });
      if (wd.approved) {
        writerPassRound = w + 1;
        break;
      }
      writerRejects += 1;
      writerFeedback = wd.reason;
      if (w === MAX_WRITER - 1) {
        return { status: "aborted", runId, reason: wd.reason, stage: "writer_manager" };
      }
    }

    title = extractMarkdownTitle(draft) || "News update";
    const serpForAudit = await serpForAuditorLine(title);

    const audit = await runExecutive({
      task: `You are the **Chief of Audit** (News). Check if the draft is **grounded in real reporting** (not obvious fabrication). First line: **VERIFIED** or **UNVERIFIED** (or **MISLEADING**). Then one short paragraph.

**Draft:**\n${draft.slice(0, 6_000)}

**Serp (independent):**\n${serpForAudit}
`,
      role: "Executive",
      department: "News — Chief of Audit",
      context: { kind: "news_chief_of_audit", runId, attempt: auditAttempt + 1 },
      assignedName: execIn,
    });
    logStage("chief_of_audit", parseAuditorDecision(audit).verified ? "VERIFIED" : "UNVERIFIED", { sample: audit.slice(0, 800) });
    const aud = parseAuditorDecision(audit, { strict: true });
    executiveRounds.push({
      pipelineRound: auditAttempt + 1,
      verified: aud.verified,
      excerpt: audit.replace(/\s+/g, " ").trim().slice(0, 3_500),
    });
    if (aud.verified) {
      lastAuditTextForEmail = audit;
      const rejExec = executiveRounds.filter((x) => !x.verified).length;
      postEmailContext = {
        draftExcerpt: draft.slice(0, 10_000),
        checklistExcerpt: checklistJson(checklist).slice(0, 8_000),
        preprod: {
          passRound: preprodPassRound,
          rejectionsBeforePass: preprodRejects,
        },
        writer: { passRound: writerPassRound, rejectionsBeforePass: writerRejects },
        audit: {
          fullPipelineRounds: executiveRounds.length,
          executiveRejectionsBeforeSuccess: rejExec,
          executiveRounds: [...executiveRounds],
        },
        serpForAudit: serpForAudit,
        newsPoolItemCount: preprodPool.length,
        topPoolTitles: preprodPool
          .slice(0, 12)
          .map((p) => p.title.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" | "),
      };
      digest.push("## Outcome", "- Chief of Audit: VERIFIED", "");
      break;
    }
    digest.push(`- Audit failed: ${aud.reason}`, "");
    if (auditAttempt === MAX_AUDIT_RETRIES - 1) {
      return { status: "aborted", runId, reason: aud.reason, stage: "auditor" };
    }
  }

  mkdirRecursiveAgentic(path.dirname(headPath));
  writeFileUtf8Agentic(
    headPath,
    digest.join("\n") + "\n\n## Draft (head)\n" + draft.slice(0, 2_000),
  );
  logStage("head_of_news", `digest ${headPath}`);

  let cover: string | null = null;
  if (withImage) {
    const leo = await resolveWorkerEnv("LEONARDO_API_KEY");
    if (leo?.trim()) {
      const brief = `Photorealistic professional news photo for: ${title}. Editorial, natural light, no text, no watermarks, wire-service style.`;
      const im = await generateHeroImage({ prompt: brief.slice(0, 500) });
      if (im.ok) {
        const up = await uploadNewsCoverPng({
          slug: `n-${Date.now()}`.replace(/[^a-z0-9-]/gi, "-").slice(0, 64),
          pngBase64: im.base64,
          mimeType: im.mimeType,
        });
        if (up.ok) cover = up.publicUrl;
      }
    }
    logStage("photographer", cover ? "cover ok" : "skip or fail");
  }

  if (!publishToSite) {
    return { status: "published", slug: "(dry-run)", runId, title };
  }

  const pub = await publishAgenticNews({
    title,
    body: draft,
    author: newsWriterByline(cwd),
    coverImageUrl: cover,
    track: "both",
    sourceCitations: {
      pool: preprodPool.slice(0, 20),
      checklist,
    },
  });
  if (!pub.ok) {
    return { status: "error", runId, message: pub.error, stage: "publish" };
  }

  await recordApproval(
    {
      department: "news",
      taskType: "News",
      inputSummary: `run ${runId}`.slice(0, 2_000),
      outputSummary: `Published /news/${pub.slug}`.slice(0, 2_000),
      managerApproved: true,
      managerReason: title,
      executiveName: execIn,
    },
    cwd,
  );

  void Promise.allSettled([
    sendHeadOfNewsPublishedEmailIfEnabled({
      cwd,
      runId,
      title,
      slug: pub.slug,
      postEmailContext,
    }),
    sendNewsAuditorPublishedEmailIfEnabled({
      cwd,
      runId,
      title,
      slug: pub.slug,
      bodyExcerpt: draft,
      auditText: lastAuditTextForEmail,
      postEmailContext,
    }),
  ]).then((results) => {
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[news-pipeline] post-publish email threw", r.reason);
      }
    }
  });

  return { status: "published", slug: pub.slug, runId, title };
}
