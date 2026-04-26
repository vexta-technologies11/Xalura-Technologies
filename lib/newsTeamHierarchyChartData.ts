import fs from "fs";
import path from "path";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import {
  type HierarchyPersona,
  type HierarchyLane,
  parseManagerBlockFromCycleMd,
  readLatestCycleMd,
} from "@/lib/agenticHierarchyChartData";
import type { PersonaActivityEntry } from "@/lib/agenticPersonaActivity";
import type { AgentNamesConfig } from "@/xalura-agentic/lib/agentNames";
import { loadAgentNamesConfig } from "@/xalura-agentic/lib/agentNames";
import { getAgenticRoot } from "@/xalura-agentic/lib/paths";

function readLatestHeadDigestLine(cwd: string): string | null {
  const dir = path.join(getAgenticRoot(cwd), "logs", "news");
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^head-.+\.md$/i.test(f) && f.toLowerCase().endsWith(".md"));
    if (files.length === 0) return null;
    let bestT = 0;
    let bestName = "";
    for (const f of files) {
      const t = fs.statSync(path.join(dir, f)).mtimeMs;
      if (t >= bestT) {
        bestT = t;
        bestName = f;
      }
    }
    if (!bestName) return null;
    const raw = fs.readFileSync(path.join(dir, bestName), "utf8");
    const line = raw
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    return line?.replace(/^#\s*/, "").slice(0, 200) ?? null;
  } catch {
    return null;
  }
}

function cleanAvatarUrl(raw?: string): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  if (t.length > 500) return t.slice(0, 500);
  return t;
}

function withConfiguredName(defaultDisplay: string, nameFromFile?: string): string {
  const t = nameFromFile?.trim();
  return t ? t : defaultDisplay;
}

function titleOr(fromConfig: string | undefined, generated: string): string {
  const t = fromConfig?.trim();
  return t && t.length > 0 ? t : generated;
}

function oneWorkerLane(
  cwd: string,
  dept: "news" | "news_preprod",
  d: AgenticLiveSnapshot["departments"][number],
  label: string,
  names: AgentNamesConfig,
): HierarchyLane {
  const cycleMd = readLatestCycleMd(dept, cwd);
  const parsed = cycleMd ? parseManagerBlockFromCycleMd(cycleMd) : null;
  const mgrCheck = parsed?.checklistBlock
    ? `**Manager checklist (latest cycle log)**\n${parsed.checklistBlock}`
    : undefined;
  const mgrFacts =
    parsed?.reason && parsed.reason.length > 0
      ? `${d.manager} — Reason: ${parsed.reason}`
      : d.manager;
  const dnames = names.departments[dept]!;
  const isNews = dept === "news";
  const exDefault = isNews ? "Chief of Audit" : "Pre-Production Lead";
  const exPosDefault = isNews ? "News · audit and publish" : "News · source selection and review";
  const mgrDefault = isNews ? `${label} Editor` : `${label} Lead`;
  const mgrPosDefault = isNews ? "News · editorial review" : "News · source review";
  const workerDefault = isNews ? "News Desk" : "Pre-Production Desk";
  const workerPosDefault = isNews ? "News · draft and citations" : "News · pool and excerpts";
  return {
    deptId: dept,
    deptLabel: label,
    executive: {
      id: `${dept}_executive`,
      displayName: withConfiguredName(exDefault, dnames.executive.name),
      position: titleOr(dnames.executive.title, exPosDefault),
      avatarUrl: cleanAvatarUrl(dnames.executive.avatar),
      facts: d.executive,
      source: d.source,
    },
    manager: {
      id: `${dept}_manager`,
      displayName: withConfiguredName(mgrDefault, dnames.manager.name),
      position: titleOr(dnames.manager.title, mgrPosDefault),
      avatarUrl: cleanAvatarUrl(dnames.manager.avatar),
      facts: mgrFacts,
      managerChecklist: mgrCheck,
      source: d.source,
    },
    workers: [
      {
        id: `${dept}_worker`,
        displayName: withConfiguredName(workerDefault, dnames.worker.name),
        position: titleOr(dnames.worker.title, workerPosDefault),
        avatarUrl: cleanAvatarUrl(dnames.worker.avatar),
        facts: d.worker,
        source: d.source,
      },
    ],
  };
}

function headOfNewsPersona(
  snap: AgenticLiveSnapshot,
  names: AgentNamesConfig,
  cwd: string,
): HierarchyPersona {
  const headLine = readLatestHeadDigestLine(cwd);
  const tail = snap.tail.slice(-5);
  const tailText = tail.map((t) => `${t.type}: ${t.summary}`).join(" · ");
  const fail = snap.failed_hint ? ` Last issue: ${snap.failed_hint}` : "";
  const headHint = headLine ? `Latest digest: ${headLine}.` : "";
  const facts =
    `${headHint} ${tailText.length > 0 ? `Pipeline tail: ${tailText}.` : "No events in local queue."}${fail}`.trim();
  return {
    id: "head_of_news",
    displayName: withConfiguredName("Head of News", names.headOfNews?.name),
    position: titleOr(names.headOfNews?.title, "Head of News · run digest & site publish"),
    avatarUrl: cleanAvatarUrl(names.headOfNews?.avatar),
    facts: facts.slice(0, 1_200),
    source: snap.tail.length > 0 || headLine != null ? "live" : "example",
  };
}

function newsPhotographerPersona(
  snap: AgenticLiveSnapshot,
  photographerOn: boolean,
  names: AgentNamesConfig,
): HierarchyPersona {
  const ppub = snap.departments.find((x) => x.id === "news");
  if (photographerOn) {
    return {
      id: "news_photographer",
      displayName: withConfiguredName("Photographer (Leonardo)", names.newsPhotographer?.name),
      position: titleOr(
        names.newsPhotographer?.title,
        "Photographer · cover image (Leonardo) before site upsert",
      ),
      avatarUrl: cleanAvatarUrl(names.newsPhotographer?.avatar),
      facts: `Enabled when LEONARDO_API_KEY is set on the Worker. Desk: ${ppub?.worker?.slice(0, 200) ?? "—"}`,
      source: ppub?.source ?? "example",
    };
  }
  return {
    id: "news_photographer",
    displayName: withConfiguredName("Photographer (Leonardo)", names.newsPhotographer?.name),
    position: titleOr(
      names.newsPhotographer?.title,
      "Photographer · cover image (optional)",
    ),
    avatarUrl: cleanAvatarUrl(names.newsPhotographer?.avatar),
    facts: "Off or missing key — set LEONARDO_API_KEY on the Worker to generate wire-style covers.",
    source: "example",
  };
}

export type NewsTeamChartPayload = {
  headOfNews: HierarchyPersona;
  preprod: HierarchyLane;
  newsWriters: HierarchyLane;
  newsPhotographer: HierarchyPersona;
  lastActionSummaries: Record<string, string>;
  personaActivity: Record<string, PersonaActivityEntry[]>;
  agentNames: AgentNamesConfig;
  /** Pre-Prod first, then Writers (same as chart columns). */
  lanes: HierarchyLane[];
};

/**
 * Admin News team org chart: Head of News → Pre-Production + News writers (Chief of audit) + Photographer.
 */
export function buildNewsTeamHierarchyChartPayload(
  cwd: string,
  snap: AgenticLiveSnapshot,
  options: { photographerOn: boolean; names?: AgentNamesConfig },
): NewsTeamChartPayload {
  const names = options?.names ?? loadAgentNamesConfig(cwd);
  const dNews = snap.departments.find((x) => x.id === "news");
  const dPre = snap.departments.find((x) => x.id === "news_preprod");
  if (!dNews || !dPre) {
    throw new Error("getNewsTeamLiveSnapshot must include news and news_preprod");
  }
  const preprod = oneWorkerLane(cwd, "news_preprod", dPre, "News — Pre-Production", names);
  const newsWriters = oneWorkerLane(cwd, "news", dNews, "News — Writers", names);
  const headOfNews = headOfNewsPersona(snap, names, cwd);
  const newsPhotographer = newsPhotographerPersona(
    snap,
    options.photographerOn,
    names,
  );
  return {
    headOfNews,
    preprod,
    newsWriters,
    newsPhotographer,
    lastActionSummaries: {},
    personaActivity: {} as Record<string, PersonaActivityEntry[]>,
    agentNames: names,
    /** Same column order for any shared tooling */
    lanes: [preprod, newsWriters],
  };
}
