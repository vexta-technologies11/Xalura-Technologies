import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import { getEffectiveGeminiModelName, resolveGeminiApiKey } from "@/xalura-agentic/lib/gemini";
import { withRetries, withTimeout } from "@/xalura-agentic/lib/watchdog";
import type { HierarchyChartPayload } from "@/lib/agenticHierarchyChartData";

const NARRATIVE_CACHE_TTL_MS = 120_000;
let narrativeCache: { key: string; narratives: Record<string, string>; at: number } | null = null;

function narrativeCacheKey(chart: HierarchyChartPayload, snap: AgenticLiveSnapshot): string {
  const tail = snap.tail
    .slice(-3)
    .map((t) => `${t.type}:${t.ts}`)
    .join("|");
  const lanes = chart.lanes
    .map((l) => `${l.deptId}:${l.manager.facts.slice(0, 80)}:${l.worker.facts.slice(0, 80)}`)
    .join("~");
  return [
    snap.failed_hint ?? "",
    tail,
    lanes,
    chart.complianceOfficer.facts.slice(0, 120),
    chart.publishingGraphicDesigner.facts.slice(0, 120),
  ].join("|");
}

function personaKeys(chart: HierarchyChartPayload): string[] {
  const keys = [chart.chief.id, chart.complianceOfficer.id];
  for (const lane of chart.lanes) {
    keys.push(lane.executive.id, lane.manager.id);
    if (lane.deptId === "publishing") keys.push(chart.publishingGraphicDesigner.id);
    keys.push(lane.worker.id);
  }
  return keys;
}

function extractJsonObject(text: string): Record<string, string> | null {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1]!.trim() : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 1200);
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * One batched Gemini call: first-person “cycle monologue” per hierarchy node.
 * Safe to skip when no key; failures return undefined (dashboard still shows `facts`).
 */
export async function enrichHierarchyNarrativesWithGemini(
  chart: HierarchyChartPayload,
  snap: AgenticLiveSnapshot,
): Promise<Record<string, string> | undefined> {
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey?.trim()) return undefined;

  const ckey = narrativeCacheKey(chart, snap);
  if (
    narrativeCache &&
    narrativeCache.key === ckey &&
    Date.now() - narrativeCache.at < NARRATIVE_CACHE_TTL_MS
  ) {
    return narrativeCache.narratives;
  }

  const keys = personaKeys(chart);
  const compact = {
    chief: { id: chart.chief.id, facts: chart.chief.facts },
    compliance_officer: {
      id: chart.complianceOfficer.id,
      facts: chart.complianceOfficer.facts,
      subtitle: chart.complianceOfficer.subtitle,
    },
    publishing_graphic_designer: {
      id: chart.publishingGraphicDesigner.id,
      facts: chart.publishingGraphicDesigner.facts,
      subtitle: chart.publishingGraphicDesigner.subtitle,
    },
    lanes: chart.lanes.map((l) => ({
      department: l.deptId,
      executive: { id: l.executive.id, facts: l.executive.facts },
      manager: {
        id: l.manager.id,
        facts: l.manager.facts,
        checklist: l.manager.managerChecklist?.slice(0, 1500) ?? "",
      },
      worker: { id: l.worker.id, facts: l.worker.facts },
    })),
    cadence: {
      slotIndex: snap.slot.slotIndex,
      endsAt: snap.slot.endsAt,
    },
    windows: snap.departments.map((d) => ({
      department: d.id,
      approvalsInWindow: d.cycle.approvalsInWindow,
      auditsCompleted: d.cycle.auditsCompleted,
    })),
  };

  const instruction = [
    "You write first-person internal monologues for an automated agent org at Xalura Tech.",
    "Output ONE JSON object only (no markdown fences). Keys must match exactly:",
    keys.map((k) => JSON.stringify(k)).join(", "),
    "Each value: one paragraph (60–160 words), first person as that role, grounded ONLY in the facts JSON.",
    "SEO Manager: mention keyword bundle / rejection / approval if facts imply it.",
    "Publishing Manager: mention drafts / attempts if implied.",
    "Chief AI: fleet-level, no fake metrics.",
    "compliance_officer: advisory to Founder after publish; Chief/Exec visibility is display-only in email — no veto over Chief.",
    "publishing_graphic_designer: first-person as hero-image prompt specialist under Publishing Manager (Imagen path).",
    "If facts are empty for a role, say you are standing by for the next cycle.",
    "",
    "FACTS_JSON:",
    JSON.stringify(compact).slice(0, 14_000),
  ].join("\n");

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const modelName = getEffectiveGeminiModelName();
    const model = genAI.getGenerativeModel({ model: modelName });
    const text = await withRetries(
      () =>
        withTimeout(55_000, "hierarchy-narratives", async () => {
          const r = await model.generateContent(instruction);
          return r.response.text();
        }),
      { maxAttempts: 2, label: "hierarchy-gemini" },
    );
    const parsed = extractJsonObject(text);
    if (parsed && Object.keys(parsed).length) {
      narrativeCache = { key: ckey, narratives: parsed, at: Date.now() };
      return parsed;
    }
    return undefined;
  } catch (e) {
    console.warn(
      "[agentic hierarchy] Gemini narrative skipped:",
      e instanceof Error ? e.message : String(e),
    );
    return undefined;
  }
}
