import { runExecutive } from "../agents/executive";
import type { DepartmentId } from "../engine/departments";
import { serpApiSearch } from "./contentWorkflow/serpApiSearch";
import { firecrawlScrape, sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";
import {
  type AuditStrategyOverlayV1,
  overlayStorageKey,
  saveStrategyOverlay,
} from "./auditStrategyOverlayStore";
import { getExecutiveAssignedName } from "./agentNames";

export type AuditStrategyContext = {
  keyword?: string;
  subcategory?: string;
  verticalLabel?: string;
};

function parseDirectiveFromChief(md: string): AuditStrategyOverlayV1["directive"] {
  const head = md.slice(0, 4_000);
  for (const d of ["CHANGE_STRATEGY", "REVIEW", "OPTIMIZE", "SCALE"] as const) {
    if (new RegExp(`\\b${d}\\b`, "i").test(head)) return d;
  }
  return "UNKNOWN";
}

function departmentLabelForExec(id: DepartmentId): string {
  if (id === "seo") return "SEO & Audit";
  if (id === "publishing") return "Publishing";
  return "Marketing";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1]!.trim() : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildFallbackSerpQuery(ctx: AuditStrategyContext): string {
  const parts = [
    ctx.keyword,
    ctx.subcategory,
    "trends",
    "hot topics",
    ctx.verticalLabel,
    "AI",
  ]
    .map((s) => s?.trim())
    .filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 180) || "technology trends AI";
}

/**
 * After Chief’s live audit markdown — gather Serp + Firecrawl, run Executive to JSON strategy overlay,
 * persist for the **next** 10-cycle window. Optional Resend to ops if `AGENTIC_STRATEGY_ALERT_EMAIL` is set.
 */
export async function runStrategicAuditEnrichment(params: {
  cwd: string;
  department: DepartmentId;
  agentLaneKey?: string;
  chiefLiveMarkdown: string;
  auditFileRelative: string;
  strategyContext?: AuditStrategyContext;
}): Promise<void> {
  const cwd = params.cwd;
  const ctx = params.strategyContext ?? {};
  const directive = parseDirectiveFromChief(params.chiefLiveMarkdown);

  const serpQuery = buildFallbackSerpQuery(ctx);
  let serpTitles: string[] = [];
  let serpError: string | undefined;
  const serp = await serpApiSearch(serpQuery, 6);
  if (serp.error) {
    serpError = serp.error;
  } else {
    serpTitles = (serp.items ?? []).map((i) => i.title).filter(Boolean);
  }

  let firecrawlExcerpt: string | undefined;
  const firstUrl = (serp.items ?? []).map((i) => i.link).find((u) => /^https?:\/\//i.test(u ?? ""));
  if (firstUrl) {
    const fc = await firecrawlScrape(firstUrl, ["markdown"]);
    if (fc.markdown) {
      firecrawlExcerpt = fc.markdown.replace(/\s+/g, " ").trim().slice(0, 4_500);
    }
  }

  const execName = getExecutiveAssignedName(params.department, cwd);
  const deLabel = departmentLabelForExec(params.department);
  const execTask = `You are the **Executive** for the **${deLabel}** department at Xalura Tech.
Chief AI just completed a 10-cycle audit. Your job is to output **one JSON object only** (no markdown, no commentary) that sets how Workers and Managers should **reposition** work in the *next* window.

**Rules**
- **Do not** abandon the team’s **assigned topic / pillar / keyword** (if provided below). The team stays on the same assignment; you only change *how* they research, angle, or template (e.g. "hot subtopics for {pillar} in AI" instead of generic "best of" roundups).
- All departments: strategy must be executable in the next 10 approval cycles.
- **seo_positioning:** How SEO Worker should run live search (angles, "hot" framing) without breaking the fixed topic row.
- **seo_serp_query_hint:** Optional short phrase to *append* to the normal topic query (not a new topic). Empty string if none.
- **publishing_template:** How Publishing Worker should structure or emphasize the next articles (headings, outline pattern). Empty if not publishing.
- **marketing_positioning:** Short angle for marketing copy. Empty if not marketing.

**Pillar / assignment (do not replace):** keyword=${ctx.keyword ?? "n/a"}, subcategory=${ctx.subcategory ?? "n/a"}, vertical=${ctx.verticalLabel ?? "n/a"}

**Chief (excerpt, truncated):**
${params.chiefLiveMarkdown.slice(0, 6_000)}

**World signals (audit-time)**
- Serp query used: ${serpQuery}
${serpError ? `- SerpAPI: ${serpError}` : `- Top organic titles: ${serpTitles.slice(0, 5).join(" | ")}`}
${firecrawlExcerpt ? `- One-page excerpt (trimmed): ${firecrawlExcerpt.slice(0, 2_000)}` : ""}

**Required JSON shape (string values, use "" for empty):**
{
  "directive": "${directive}",
  "seo_positioning": "string",
  "seo_serp_query_hint": "string",
  "publishing_template": "string",
  "marketing_positioning": "string"
}`;

  const execContext = { audit_path: params.auditFileRelative, phase: "audit_strategy" };
  let outText: string;
  try {
    outText = await runExecutive({
      role: "Executive",
      department: deLabel,
      task: execTask,
      context: execContext,
      assignedName: execName,
    });
  } catch (e) {
    outText = `{"seo_positioning":"","seo_serp_query_hint":"","publishing_template":"","marketing_positioning":""}`;
  }

  const j = extractJsonObject(outText) ?? {};
  const o: AuditStrategyOverlayV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    auditFileRelative: params.auditFileRelative.replace(/\\/g, "/"),
    department: params.department,
    agentLaneKey: params.agentLaneKey?.trim() ? params.agentLaneKey.trim() : null,
    directive: (j["directive"] as AuditStrategyOverlayV1["directive"]) || directive,
    seo_positioning: String(j["seo_positioning"] ?? "").slice(0, 2_000),
    seo_serp_query_hint: String(j["seo_serp_query_hint"] ?? "").slice(0, 400),
    publishing_template: String(j["publishing_template"] ?? "").slice(0, 2_000),
    marketing_positioning: String(j["marketing_positioning"] ?? "").slice(0, 2_000),
    world_evidence: {
      serp_query: serpQuery,
      serp_titles: serpTitles.slice(0, 8),
      firecrawl_excerpt: firecrawlExcerpt?.slice(0, 1_200),
    },
  };

  saveStrategyOverlay(cwd, o);

  const alertTo = (await resolveWorkerEnv("AGENTIC_STRATEGY_ALERT_EMAIL"))?.trim();
  if (alertTo) {
    const key = await resolveWorkerEnv("RESEND_API_KEY");
    if (key) {
      const k = overlayStorageKey(params.department, params.agentLaneKey);
      const body = [
        `Strategy overlay updated for **${k}** after 10-cycle audit.`,
        `Directive: ${o.directive}`,
        `SEO positioning: ${o.seo_positioning || "—"}`,
        `Serp hint: ${o.seo_serp_query_hint || "—"}`,
        `Publishing template: ${o.publishing_template || "—"}`,
        `Marketing: ${o.marketing_positioning || "—"}`,
        `Audit: ${o.auditFileRelative}`,
      ].join("\n\n");
      const sent = await sendResendEmail({
        to: [alertTo],
        subject: `[Xalura agentic] Strategy overlay: ${k}`,
        text: body,
      });
      if (sent.error) {
        console.warn(`[auditStrategy] Resend: ${sent.error}`);
      }
    }
  }
}
