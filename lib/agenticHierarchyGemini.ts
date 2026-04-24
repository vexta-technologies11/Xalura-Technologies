import type { PersonaActivityEntry } from "@/lib/agenticPersonaActivity";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import { getEffectiveGeminiModelName, resolveGeminiApiKey } from "@/xalura-agentic/lib/gemini";
import { withRetries, withTimeout } from "@/xalura-agentic/lib/watchdog";
import type { HierarchyChartPayload } from "@/lib/agenticHierarchyChartData";

const SUMMARY_CACHE_TTL_MS = 120_000;
let summaryCache: { key: string; summaries: Record<string, string>; at: number } | null = null;

/** Same ordering as the hierarchy chart: Chief → SEO, Publishing, Marketing (exec…workers) → Head of Compliance. */
export function hierarchyPersonaIds(chart: HierarchyChartPayload): string[] {
  const keys = [chart.chief.id];
  for (const lane of chart.lanes) {
    keys.push(lane.executive.id, lane.manager.id);
    if (lane.deptId === "publishing") keys.push(chart.publishingGraphicDesigner.id);
    for (const w of lane.workers) keys.push(w.id);
  }
  keys.push(chart.complianceOfficer.id);
  return keys;
}

function lastActionCacheKey(chart: HierarchyChartPayload, snap: AgenticLiveSnapshot): string {
  const parts: string[] = [];
  const t = snap.tail;
  if (t.length) {
    const u = t[t.length - 1]!;
    parts.push(`${u.ts}|${u.type}|${u.summary}`.slice(0, 400));
  } else {
    parts.push("notail");
  }
  for (const id of hierarchyPersonaIds(chart)) {
    const a = chart.personaActivity[id]?.[0];
    if (!a) {
      parts.push(`${id}:empty`);
      continue;
    }
    parts.push(`${id}:${a.at}|${a.kind}|${a.source.slice(0, 120)}|${a.label.slice(0, 200)}`);
  }
  return parts.join("¦");
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
      if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 600);
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * When `GEMINI_API_KEY` is off or the model fails, show a one-line from raw log fields.
 */
export function fallbackLastActionSummary(entries: PersonaActivityEntry[] | undefined): string {
  const a = entries?.[0];
  if (!a) return "No recorded activity for this card yet.";
  const d = a.detail?.replace(/\s+/g, " ").trim();
  if (d) {
    return `${a.label} — ${d}`.length > 420
      ? `${(a.label + " — " + d).slice(0, 417)}…`
      : `${a.label} — ${d}`;
  }
  return a.label;
}

/**
 * Batched Gemini: one neutral, third-person line per persona describing **only** the latest
 * `personaActivity` row. No “my role is…” monologues.
 * Returns `undefined` if the API is unavailable; callers should use `fallbackLastActionSummary` per id.
 */
export async function enrichLastActionSummariesWithGemini(
  chart: HierarchyChartPayload,
  snap: AgenticLiveSnapshot,
): Promise<Record<string, string> | undefined> {
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey?.trim()) return undefined;

  const ckey = lastActionCacheKey(chart, snap);
  if (
    summaryCache &&
    summaryCache.key === ckey &&
    Date.now() - summaryCache.at < SUMMARY_CACHE_TTL_MS
  ) {
    return summaryCache.summaries;
  }

  const keys = hierarchyPersonaIds(chart);
  const lastByKey: Record<
    string,
    {
      at: string;
      kind: string;
      source: string;
      label: string;
      detail?: string;
    } | null
  > = {};
  for (const k of keys) {
    const a = chart.personaActivity[k]?.[0] ?? null;
    lastByKey[k] = a
      ? {
          at: a.at,
          kind: a.kind,
          source: a.source,
          label: a.label,
          detail: a.detail,
        }
      : null;
  }

  const instruction = [
    "You are summarizing the MOST RECENT internal log line for each org role on an admin dashboard.",
    "Output ONE JSON object only. No markdown fences. Keys (exactly these strings):",
    keys.map((k) => JSON.stringify(k)).join(", "),
    "Each value: exactly ONE or TWO short sentences, plain English, max 50 words, describing what happened in that last log (who did what, outcome) based ONLY on LAST_LOG_JSON for that key.",
    "",
    "STYLE:",
    "- Third person or neutral: e.g. “Publishing sent …”, “The last cycle shows …” — or passive voice.",
    "- Be specific when label/detail mention titles, decisions, or files.",
    "",
    "FORBIDDEN in every value (these lines will be rejected by readers):",
    "- Any first person: I, me, my, we, our, “I am”, “my role is”, “I oversee”, “I stand by”, “as your Chief”",
    "- Role self-introduction or job-description fluff",
    "- Inventing metrics, URLs, or events not in the JSON",
    "",
    "If LAST_LOG_JSON[k] is null, use EXACTLY this sentence: \"No recorded activity for this card yet.\"",
    "",
    "LAST_LOG_JSON:",
    JSON.stringify(lastByKey).slice(0, 12_000),
  ].join("\n");

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const modelName = getEffectiveGeminiModelName();
    const model = genAI.getGenerativeModel({ model: modelName });
    const text = await withRetries(
      () =>
        withTimeout(55_000, "hierarchy-last-action", async () => {
          const r = await model.generateContent(instruction);
          return r.response.text();
        }),
      { maxAttempts: 2, label: "hierarchy-last-action-gemini" },
    );
    const parsed = extractJsonObject(text);
    if (parsed && Object.keys(parsed).length) {
      const filtered: Record<string, string> = {};
      for (const k of keys) {
        const v = parsed[k];
        if (v?.trim()) filtered[k] = v.trim();
      }
      if (Object.keys(filtered).length) {
        summaryCache = { key: ckey, summaries: filtered, at: Date.now() };
        return filtered;
      }
    }
    return undefined;
  } catch (e) {
    console.warn(
      "[agentic hierarchy] Gemini last-action summary skipped:",
      e instanceof Error ? e.message : String(e),
    );
    return undefined;
  }
}
