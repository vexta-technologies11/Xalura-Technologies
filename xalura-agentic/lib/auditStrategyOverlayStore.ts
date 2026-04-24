import fs from "fs";
import path from "path";
import type { DepartmentId } from "../engine/departments";
import { isAgenticDiskWritable, readFileUtf8Agentic, writeFileUtf8Agentic } from "./agenticDisk";
import { getAgenticRoot } from "./paths";

const FILE = "audit-strategy-overlays.json";

export type AuditStrategyOverlayV1 = {
  version: 1;
  updatedAt: string;
  auditFileRelative: string;
  department: DepartmentId;
  /** e.g. `seo:tp-…` or `publishing:sc-…` — `null` = department default bucket */
  agentLaneKey: string | null;
  directive: "SCALE" | "OPTIMIZE" | "REVIEW" | "CHANGE_STRATEGY" | "UNKNOWN";
  /**
   * How to run research / position content **without** abandoning the assigned pillar or topic;
   * e.g. reframe from “what is the best X” to “current hot subtopics for X in AI.”
   */
  seo_positioning: string;
  /** Optional extra Serp phrasing (merged with topic query — must stay on-pillar) */
  seo_serp_query_hint: string;
  /** Publishing: article template / section emphasis for the next window */
  publishing_template: string;
  /** Marketing: narrative / CTA emphasis */
  marketing_positioning: string;
  world_evidence: {
    serp_query: string;
    serp_titles: string[];
    firecrawl_excerpt?: string;
  };
};

export type AuditStrategyStoreFile = {
  version: 1;
  /** Key: `marketing` | `publishing` | `seo` or `seo:laneId` / `publishing:laneId` */
  overlays: Record<string, AuditStrategyOverlayV1>;
};

function storePath(cwd: string): string {
  return path.join(getAgenticRoot(cwd), "data", FILE);
}

function defaultStore(): AuditStrategyStoreFile {
  return { version: 1, overlays: {} };
}

/** `agentLaneId` = short id (`tp-…`, `sc-…`, vertical id) or full `seo:…` from audit params */
export function overlayStorageKey(department: DepartmentId, agentLaneId: string | undefined): string {
  const raw = agentLaneId?.trim();
  if (!raw) return department;
  if (raw.includes(":")) {
    return raw.toLowerCase();
  }
  if (department === "seo" || department === "publishing") {
    return `${department}:${raw.toLowerCase()}`;
  }
  return department;
}

export function loadStrategyOverlay(
  cwd: string,
  department: DepartmentId,
  agentLaneId: string | undefined,
): AuditStrategyOverlayV1 | null {
  const p = storePath(cwd);
  try {
    if (!fs.existsSync(p)) return null;
  } catch {
    return null;
  }
  const raw = readFileUtf8Agentic(p);
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuditStrategyStoreFile>;
    if (!parsed.overlays) return null;
    const k = overlayStorageKey(department, agentLaneId);
    const o = parsed.overlays[k] ?? (k !== department ? parsed.overlays[department] : undefined);
    if (!o || o.version !== 1) return null;
    return o as AuditStrategyOverlayV1;
  } catch {
    return null;
  }
}

export function saveStrategyOverlay(cwd: string, overlay: AuditStrategyOverlayV1): void {
  if (!isAgenticDiskWritable()) return;
  const p = storePath(cwd);
  let store: AuditStrategyStoreFile = defaultStore();
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      const o = JSON.parse(raw) as Partial<AuditStrategyStoreFile>;
      if (o?.overlays && typeof o.overlays === "object") {
        store = { version: 1, overlays: o.overlays as Record<string, AuditStrategyOverlayV1> };
      }
    }
  } catch {
    store = defaultStore();
  }
  const k = overlayStorageKey(overlay.department, overlay.agentLaneKey ?? undefined);
  store.overlays[k] = { ...overlay, version: 1 };
  writeFileUtf8Agentic(p, `${JSON.stringify(store, null, 2)}\n`);
}

/** Preamble for Worker/Manager (next window until the following audit) */
export function formatStrategyPreamble(
  department: DepartmentId,
  o: AuditStrategyOverlayV1 | null,
): string {
  if (!o) return "";
  const w = o.world_evidence;
  const ev = [
    w.serp_query && `**Research query used in audit window:** ${w.serp_query}`,
    w.serp_titles.length && `**SERP snapshot (titles):** ${w.serp_titles.slice(0, 5).join(" · ")}`,
    w.firecrawl_excerpt && `**Source excerpt (trimmed):** ${w.firecrawl_excerpt.slice(0, 500)}${w.firecrawl_excerpt.length > 500 ? "…" : ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  const parts: string[] = [
    "",
    `## Executive / Chief strategy overlay (applies **until the next 10-cycle audit**; do not break your assigned topic/pillar)`,
    `- **Directive (signal):** ${o.directive}`,
    `### Positioning (stay on your assignment; reframe *how* you research/angle, not the pillar)`,
  ];
  if (department === "seo" && o.seo_positioning.trim()) {
    parts.push(`- **SEO research angle:** ${o.seo_positioning.trim()}`);
    if (o.seo_serp_query_hint.trim()) {
      parts.push(
        `- **Serp / “hot topic” phrasing to merge with the assigned keyword row:** ${o.seo_serp_query_hint.trim()}`,
      );
    }
  }
  if (department === "publishing" && o.publishing_template.trim()) {
    parts.push(`- **Article / outline template for this window:** ${o.publishing_template.trim()}`);
  }
  if (department === "marketing" && o.marketing_positioning.trim()) {
    parts.push(`- **Marketing copy angle:** ${o.marketing_positioning.trim()}`);
  }
  if (ev) {
    parts.push("### World evidence (audit-time)", ev);
  }
  parts.push("");
  return parts.join("\n");
}

export function formatStrategyNoteForManager(o: AuditStrategyOverlayV1 | null): string {
  if (!o) return "";
  return `\n## Strategy overlay (from last audit — ${o.directive})
Keep gates strict; if Worker drafts drift off the assigned pillar, reject. ${o.seo_positioning.slice(0, 200)}${o.seo_positioning.length > 200 ? "…" : ""}`.trim();
}
