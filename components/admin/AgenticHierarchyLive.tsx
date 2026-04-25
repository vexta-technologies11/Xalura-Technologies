"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import type {
  HierarchyChartPayload,
  HierarchyPersona,
} from "@/lib/agenticHierarchyChartData";
import { readResponseJson } from "@/lib/readResponseJson";
import { capNewestFirstLinesToWordBudget, countWords } from "@/lib/activityWordCap";
import type { AgentNamesConfig } from "@/xalura-agentic/lib/agentNames";

type LiveApiResponse = AgenticLiveSnapshot & { chart?: HierarchyChartPayload };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function initials(name: string): string {
  const parts = name.replace(/\s+/g, " ").trim().split(" ");
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  const p = parts[0] ?? "?";
  return p.slice(0, 2).toUpperCase();
}

const MAX_ACTIVITY_WORDS = 1_000;

type PipelineLogFeedRow = {
  created_at: string;
  department: string;
  agent_lane_id: string | null;
  stage: string;
  event: string;
  summary: string;
};

function formatPipelineFeedLine(r: PipelineLogFeedRow): string {
  const t = r.created_at?.slice(0, 19)?.replace("T", " ") ?? "?";
  const lane = r.agent_lane_id?.trim()
    ? ` / ${r.agent_lane_id.trim()}`
    : "";
  return `[${t}] ${r.department}${lane} / ${r.stage} / ${r.event}: ${r.summary}`.replace(/\s+/g, " ").trim();
}

type PipelineDeptKey = "seo" | "publishing" | "marketing" | "chief" | "compliance" | "other";

const PIPELINE_DEPT_LABEL: Record<PipelineDeptKey, string> = {
  seo: "SEO",
  publishing: "Publishing",
  marketing: "Marketing",
  chief: "Chief AI",
  compliance: "Head of Compliance",
  other: "Other",
};

const PIPELINE_DEPT_ORDER: Record<PipelineDeptKey, number> = {
  seo: 0,
  publishing: 1,
  marketing: 2,
  chief: 3,
  compliance: 4,
  other: 5,
};

/** Synthetic line prefix (never from Supabase) so the word cap can round-trip section headers. */
const ACTIVITY_DEPT_SECTION_PREFIX = "\u200cdep|";

function normalizePipelineDepartment(raw: string): PipelineDeptKey {
  const s = raw.trim().toLowerCase();
  if (!s) return "other";
  if (s === "seo") return "seo";
  if (s === "publishing") return "publishing";
  if (s === "marketing") return "marketing";
  if (s === "chief" || s.startsWith("chief") || s.includes("chiefai") || s.includes("chief ai")) {
    return "chief";
  }
  if (s === "compliance" || s.includes("compliance") || s.includes("head of compliance")) {
    return "compliance";
  }
  return "other";
}

function makeActivityDeptSectionLine(k: PipelineDeptKey): string {
  return `${ACTIVITY_DEPT_SECTION_PREFIX}${k}|${PIPELINE_DEPT_LABEL[k]}`;
}

function parseActivityDeptSectionLine(line: string): { key: PipelineDeptKey; label: string } | null {
  if (!line.startsWith(ACTIVITY_DEPT_SECTION_PREFIX)) return null;
  const rest = line.slice(ACTIVITY_DEPT_SECTION_PREFIX.length);
  const i = rest.indexOf("|");
  if (i < 0) return null;
  const key = rest.slice(0, i) as PipelineDeptKey;
  const label = rest.slice(i + 1);
  if (key in PIPELINE_DEPT_LABEL) return { key, label };
  return { key: "other", label };
}

function buildActivityFeedLinesByDepartment(rows: PipelineLogFeedRow[]): string[] {
  const by = new Map<PipelineDeptKey, PipelineLogFeedRow[]>();
  for (const r of rows) {
    const k = normalizePipelineDepartment(r.department);
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(r);
  }
  const keys: PipelineDeptKey[] = Array.from(by.keys()).filter(
    (k) => (by.get(k) ?? []).length > 0,
  );
  const maxT = (list: PipelineLogFeedRow[]) =>
    list.length > 0 ? Math.max(...list.map((r) => new Date(r.created_at).getTime())) : 0;
  keys.sort((a: PipelineDeptKey, b: PipelineDeptKey) => {
    const d = maxT(by.get(b)!) - maxT(by.get(a)!);
    if (d !== 0) return d;
    return PIPELINE_DEPT_ORDER[a] - PIPELINE_DEPT_ORDER[b];
  });
  const out: string[] = [];
  for (const k of keys) {
    const list = by.get(k)!;
    out.push(makeActivityDeptSectionLine(k));
    for (const r of list) {
      out.push(formatPipelineFeedLine(r));
    }
  }
  return out;
}

type ActivityFeedItem =
  | { t: "section"; label: string }
  | { t: "row"; text: string };

function cappedActivityLinesToFeedItems(capped: string[]): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];
  for (const line of capped) {
    const p = parseActivityDeptSectionLine(line);
    if (p) {
      items.push({ t: "section", label: p.label });
    } else {
      items.push({ t: "row", text: line });
    }
  }
  return items;
}

const ZOOM_KEY = "xalura-hierarchy-chart-zoom";
const LAYOUT_KEY = "xalura-hierarchy-worker-layout";
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.45;
const ZOOM_STEP = 0.05;
const ZOOM_DEFAULT = 1;
/** If chart zoom is within this of 100%, we treat it as "standard" for fit-to-width. */
const ZOOM_DEFAULT_TOL = 0.02;
const H_FIT_MIN = 0.18;

/** Band grid: 1 column at 100% (wide cards) → up to 5 at min chart zoom (0.35). */
const BAND_GRID_COLS_MIN = 1;
const BAND_GRID_COLS_MAX = 5;

/**
 * 1 = full pillar width (only layout that is ~2× a 2-up cell). Any 2+ columns split the rail in half+.
 * Many users sit at 55–80% chart zoom for overview — that must stay 1 col or you get a permanent 2×2 of skinny tiles.
 * Multi-column only when really zoomed out to see the whole tree small.
 */
function bandGridColumnsForChartZoom(z: number): number {
  let cols: number;
  if (z >= 0.45) cols = 1;
  else if (z > 0.4) cols = 2;
  else if (z > 0.36) cols = 3;
  else if (z > 0.35) cols = 4;
  else cols = 5;
  return Math.max(BAND_GRID_COLS_MIN, Math.min(BAND_GRID_COLS_MAX, cols));
}

type WorkerLayoutMode = "auto" | "stack" | "band";

function readStoredZoom(): number {
  if (typeof window === "undefined") return ZOOM_DEFAULT;
  try {
    const v = sessionStorage.getItem(ZOOM_KEY);
    const n = v == null ? NaN : parseFloat(v);
    if (Number.isFinite(n) && n >= ZOOM_MIN && n <= ZOOM_MAX) return n;
  } catch {
    /* ignore */
  }
  return ZOOM_DEFAULT;
}

function readStoredLayout(): WorkerLayoutMode {
  if (typeof window === "undefined") return "auto";
  try {
    const v = sessionStorage.getItem(LAYOUT_KEY) as WorkerLayoutMode | null;
    if (v === "auto" || v === "stack" || v === "band") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function personaFieldsFromConfig(
  names: AgentNamesConfig | undefined,
  personaId: string,
): { name: string; title: string; avatar: string } {
  if (!names) return { name: "", title: "", avatar: "" };
  if (personaId === "chief") {
    const c = names.chiefAI;
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  if (personaId === "compliance_officer") {
    const c = names.complianceOfficer ?? { name: "" };
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  if (personaId === "publishing_graphic_designer") {
    const c = names.graphicDesigner ?? { name: "" };
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  if (personaId === "head_of_news") {
    const c = names.headOfNews ?? { name: "" };
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  if (personaId === "news_photographer") {
    const c = names.newsPhotographer ?? { name: "" };
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  const pillar = /^(seo|publishing)_worker_(.+)$/.exec(personaId);
  if (pillar) {
    const d = pillar[1] as "seo" | "publishing";
    const lane = pillar[2] ?? "";
    const c = names.departments[d]?.workersByPillar?.[lane] ?? { name: "" };
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  const m = /^(marketing|publishing|seo|news|news_preprod)_(worker|manager|executive)$/.exec(personaId);
  if (m) {
    const d = m[1] as keyof typeof names.departments;
    const r = m[2] as "worker" | "manager" | "executive";
    const c = names.departments[d]![r];
    return { name: c.name ?? "", title: c.title ?? "", avatar: c.avatar ?? "" };
  }
  return { name: "", title: "", avatar: "" };
}

function looksLikeImageUrl(url: string): boolean {
  if (!url.trim()) return false;
  if (url.startsWith("/")) return true;
  if (/^https?:\/\//i.test(url)) return true;
  return false;
}

export function PersonaPill(props: {
  persona: HierarchyPersona;
  tier: "chief" | "exec" | "mgr" | "worker" | "compliance" | "graphic";
  configNameKey: string;
  initialName: string;
  initialTitle: string;
  initialAvatar: string;
  onSaveIdentity: (f: { name: string; title: string; avatar: string }) => void | Promise<void>;
  nameSaving?: boolean;
  nameError?: string | null;
  /** Tighter card for pillar grid (SEO / Publishing) */
  compact?: boolean;
}) {
  const { persona, tier, configNameKey, initialName, initialTitle, initialAvatar, onSaveIdentity, nameSaving, nameError, compact } = props;
  const nameInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const tierClass =
    tier === "chief"
      ? "ah-pill--chief"
      : tier === "exec"
        ? "ah-pill--exec"
        : tier === "mgr"
          ? "ah-pill--mgr"
          : tier === "compliance"
            ? "ah-pill--compliance"
            : tier === "graphic"
              ? "ah-pill--graphic"
              : "ah-pill--worker";
  const demo = persona.source === "example" ? " ah-pill--demo" : "";
  const comp = compact && tier === "worker" ? " ah-pill--band" : "";
  const resolvedAvatar = (persona.avatarUrl?.trim() || initialAvatar?.trim() || "") as string;
  const useImg = !imgError && resolvedAvatar && looksLikeImageUrl(resolvedAvatar);
  useEffect(() => {
    setImgError(false);
  }, [configNameKey, resolvedAvatar]);
  return (
    <div className={`ah-pill ${tierClass}${demo}${comp}`}>
      <div className={`ah-pill__avatar${useImg ? " ah-pill__avatar--photo" : ""}`} aria-hidden>
        {useImg ? (
          // User-supplied URL from config; Next/Image not suitable for all domains without config
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={configNameKey}
            className="ah-pill__avatar-img"
            src={resolvedAvatar}
            alt=""
            onError={() => {
              setImgError(true);
            }}
          />
        ) : (
          <span className="ah-pill__avatar-initials">{initials(persona.displayName)}</span>
        )}
      </div>
      <div className="ah-pill__body">
        <div className="ah-pill__name">{persona.displayName}</div>
        <div className="ah-pill__role" title={persona.position}>
          {persona.position}
        </div>
        <details className="ah-pill__identity">
          <summary>Identity (name, title, image URL)</summary>
          <p className="ah-pill__identity-hint">
            JPG/PNG via URL — use a path like <code>/agentic-avatars/role.jpg</code> in <code>public/</code> or a full
            <code>https://</code> link.
          </p>
          <div className="ah-pill__nameform">
            <label className="ah-pill__nameform-label" htmlFor={`ah-name-${persona.id}`}>
              Display name
            </label>
            <div className="ah-pill__nameform-row">
              <input
                id={`ah-name-${persona.id}`}
                ref={nameInputRef}
                className="ah-pill__nameform-input"
                type="text"
                key={`n-${configNameKey}`}
                defaultValue={initialName}
                autoComplete="off"
                disabled={nameSaving}
              />
            </div>
            <label className="ah-pill__nameform-label" htmlFor={`ah-title-${persona.id}`}>
              Title
            </label>
            <div className="ah-pill__nameform-row">
              <input
                id={`ah-title-${persona.id}`}
                ref={titleInputRef}
                className="ah-pill__nameform-input"
                type="text"
                key={`t-${configNameKey}`}
                defaultValue={initialTitle}
                autoComplete="off"
                disabled={nameSaving}
              />
            </div>
            <label className="ah-pill__nameform-label" htmlFor={`ah-avatar-${persona.id}`}>
              Avatar URL
            </label>
            <div className="ah-pill__nameform-row">
              <input
                id={`ah-avatar-${persona.id}`}
                ref={avatarInputRef}
                className="ah-pill__nameform-input"
                type="url"
                inputMode="url"
                key={`a-${configNameKey}`}
                defaultValue={initialAvatar}
                placeholder="https://… or /agentic-avatars/….jpg"
                autoComplete="off"
                disabled={nameSaving}
              />
              <button
                type="button"
                className="ah-pill__nameform-btn"
                disabled={nameSaving}
                onClick={() => {
                  setImgError(false);
                  void onSaveIdentity({
                    name: nameInputRef.current?.value ?? "",
                    title: titleInputRef.current?.value ?? "",
                    avatar: avatarInputRef.current?.value ?? "",
                  });
                }}
              >
                {nameSaving ? "…" : "Save"}
              </button>
            </div>
            {nameError != null && nameError.trim() ? (
              <p className="ah-pill__nameform-err" role="alert">
                {nameError}
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}

export function AgenticHierarchyLive() {
  const [snap, setSnap] = useState<LiveApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nameSaveId, setNameSaveId] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<{ personaId: string; message: string } | null>(null);
  const [nameTick, setNameTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [chartZoom, setChartZoom] = useState(ZOOM_DEFAULT);
  const [workerLayout, setWorkerLayout] = useState<WorkerLayoutMode>("auto");
  const [restored, setRestored] = useState(false);
  /** At chart zoom 100%: horizontal scale so the L1 row (all 4 depts) fits the scroller. */
  const [hFit, setHFit] = useState(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const l1BlockRef = useRef<HTMLDivElement>(null);
  const naturalL1WRef = useRef<number | null>(null);
  const prevDefaultZoomRef = useRef(false);
  const fitLayoutKeyRef = useRef("");

  useEffect(() => {
    setChartZoom(readStoredZoom());
    setWorkerLayout(readStoredLayout());
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(ZOOM_KEY, String(chartZoom));
    } catch {
      /* ignore */
    }
  }, [chartZoom, restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(LAYOUT_KEY, workerLayout);
    } catch {
      /* ignore */
    }
  }, [workerLayout, restored]);

  /** Pillar workers (SEO / Pub): band grid 2–5 columns by chart zoom, or one column (Stacked). */
  const bandLayoutActive = useMemo(
    () => workerLayout === "stack" ? false : true,
    [workerLayout],
  );

  const bandWorkerCols = useMemo(
    () => (bandLayoutActive ? bandGridColumnsForChartZoom(chartZoom) : 1),
    [bandLayoutActive, chartZoom],
  );

  const bandColCssVars = {
    ["--ah-pillar-cols" as string]: String(bandWorkerCols),
  } as CSSProperties;

  /** Narrower min track when more columns so the row uses width without clipping. */
  const bandMinRem =
    bandWorkerCols <= 1
      ? 7.5
      : bandWorkerCols === 2
        ? 5.0
        : bandWorkerCols === 3
          ? 2.75
          : bandWorkerCols === 4
            ? 2.3
            : 2.0;
  const bandRailRowStyle: CSSProperties = {
    ...bandColCssVars,
    gridTemplateColumns: `repeat(${bandWorkerCols}, minmax(${bandMinRem}rem, 1fr))`,
  };

  const setZoom = useCallback((next: number) => {
    const r = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next / ZOOM_STEP) * ZOOM_STEP));
    setChartZoom(r);
  }, []);

  const onChartWheel = useCallback((e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setChartZoom((z) => {
      const d = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      return Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, Math.round((z + d) / ZOOM_STEP) * ZOOM_STEP),
      );
    });
  }, []);

  const chartZoomIsDefault = useMemo(
    () => Math.abs(chartZoom - ZOOM_DEFAULT) <= ZOOM_DEFAULT_TOL,
    [chartZoom],
  );

  useLayoutEffect(() => {
    if (!prevDefaultZoomRef.current && chartZoomIsDefault) {
      naturalL1WRef.current = null;
      setHFit(1);
    } else if (!chartZoomIsDefault) {
      naturalL1WRef.current = null;
      setHFit(1);
    }
    prevDefaultZoomRef.current = chartZoomIsDefault;
  }, [chartZoomIsDefault]);

  const chart = snap?.chart;
  const fitLayoutKey = useMemo(() => {
    if (!chart) return "";
    return [workerLayout, bandLayoutActive ? 1 : 0, chart.lanes.map((l) => l.deptId).join(",")].join(
      "|",
    );
  }, [chart, workerLayout, bandLayoutActive]);

  useLayoutEffect(() => {
    if (fitLayoutKey && fitLayoutKeyRef.current !== fitLayoutKey) {
      naturalL1WRef.current = null;
      setHFit(1);
    }
    if (fitLayoutKey) fitLayoutKeyRef.current = fitLayoutKey;
  }, [fitLayoutKey]);

  const effectiveTreeZoom = chartZoom * (chartZoomIsDefault ? hFit : 1);

  useLayoutEffect(() => {
    if (!chart || !chartZoomIsDefault) return;
    const sc = scrollerRef.current;
    const l1 = l1BlockRef.current;
    if (!sc || !l1) return;
    const measure = () => {
      if (naturalL1WRef.current == null && hFit < 0.999) {
        setHFit(1);
        return;
      }
      if (naturalL1WRef.current == null) {
        const nat = l1.scrollWidth;
        naturalL1WRef.current = nat > 1 ? nat : 1;
      }
      const wAvail = Math.max(0, sc.clientWidth - 8);
      const ratio = wAvail / naturalL1WRef.current!;
      /* Only shrink when the row clearly overflows (not for a few trailing pixels). */
      const next =
        ratio >= 0.95 ? 1 : Math.min(1, Math.max(H_FIT_MIN, ratio));
      setHFit((prev) => (Math.abs(prev - next) < 0.006 ? prev : next));
    };
    measure();
    const id = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => {
      void measure();
    });
    ro.observe(sc);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [chart, chartZoomIsDefault, hFit, fitLayoutKey, bandWorkerCols, bandLayoutActive, workerLayout]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/agentic-live", { credentials: "include" });
        const parsed = await readResponseJson<Record<string, unknown>>(res);
        if (!parsed.ok) {
          if (!cancelled) setErr(parsed.error);
          return;
        }
        const j = parsed.data;
        if (!res.ok) {
          if (!cancelled) setErr(typeof j["error"] === "string" ? j["error"] : res.statusText);
          return;
        }
        if (!cancelled) {
          setErr(null);
          setSnap(j as unknown as LiveApiResponse);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    }
    void poll();
    const id = setInterval(() => void poll(), 3200);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function loadLive() {
    setErr(null);
    const res = await fetch("/api/admin/agentic-live", { credentials: "include" });
    const parsed = await readResponseJson<Record<string, unknown>>(res);
    if (!parsed.ok) {
      setErr(parsed.error);
      return;
    }
    const j = parsed.data;
    if (!res.ok) {
      setErr(typeof j["error"] === "string" ? j["error"] : res.statusText);
      return;
    }
    setSnap(j as unknown as LiveApiResponse);
  }

  async function savePersonaIdentity(
    personaId: string,
    f: { name: string; title: string; avatar: string },
  ) {
    setNameErr(null);
    setNameSaveId(personaId);
    try {
      const res = await fetch("/api/admin/agentic-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ personaId, name: f.name, title: f.title, avatar: f.avatar }),
      });
      const parsed = await readResponseJson<{ error?: string; agentNames?: AgentNamesConfig }>(res);
      if (!parsed.ok) {
        setNameErr({ personaId, message: parsed.error });
        return;
      }
      const j = parsed.data;
      if (!res.ok) {
        setNameErr({ personaId, message: j.error ?? res.statusText });
        return;
      }
      if (j.agentNames) {
        setSnap((prev) => {
          if (prev == null) return prev;
          const c = prev.chart;
          if (!c) return prev;
          return {
            ...prev,
            chart: { ...c, agentNames: j.agentNames! },
          } as LiveApiResponse;
        });
        setNameTick((t) => t + 1);
      }
      void loadLive();
    } catch (e) {
      setNameErr({
        personaId,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setNameSaveId(null);
    }
  }

  const msLeft =
    snap != null ? Math.max(0, new Date(snap.slot.endsAt).getTime() - now) : 0;
  const pct =
    snap != null && snap.publishCycleMs > 0
      ? Math.min(100, Math.round((1 - msLeft / snap.publishCycleMs) * 100))
      : 0;

  const agentNames = chart?.agentNames;

  const [activityItems, setActivityItems] = useState<ActivityFeedItem[]>([]);
  const [activityErr, setActivityErr] = useState<string | null>(null);
  const [activityWordNote, setActivityWordNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFeed() {
      try {
        const res = await fetch("/api/admin/agentic-activity-feed?limit=400", { credentials: "include" });
        const parsed = await readResponseJson<{ ok?: boolean; rows?: PipelineLogFeedRow[]; error?: string }>(res);
        if (cancelled) return;
        if (!parsed.ok) {
          setActivityErr(parsed.error);
          return;
        }
        const j = parsed.data;
        if (!res.ok) {
          setActivityErr(typeof j["error"] === "string" ? j["error"] : res.statusText);
          return;
        }
        if (j.ok !== true || !j.rows) {
          setActivityErr(typeof j["error"] === "string" ? j["error"] : "Activity feed response invalid");
          return;
        }
        setActivityErr(null);
        const byDept = buildActivityFeedLinesByDepartment(j.rows);
        const capped = capNewestFirstLinesToWordBudget(byDept, MAX_ACTIVITY_WORDS);
        const before = countWords(byDept.join(" "));
        const after = countWords(capped.join(" "));
        if (before > after) {
          setActivityWordNote(
            `Newest first within each department; display trimmed to ${MAX_ACTIVITY_WORDS} words (full history stays in Supabase).`,
          );
        } else {
          setActivityWordNote(null);
        }
        setActivityItems(cappedActivityLinesToFeedItems(capped));
      } catch (e) {
        if (!cancelled) {
          setActivityErr(e instanceof Error ? e.message : String(e));
        }
      }
    }
    void loadFeed();
    const id = setInterval(() => void loadFeed(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function pillNameProps(personaId: string) {
    const f = personaFieldsFromConfig(agentNames, personaId);
    return {
      configNameKey: `${nameTick}-${f.name}-${f.title}-${f.avatar}`,
      initialName: f.name,
      initialTitle: f.title,
      initialAvatar: f.avatar,
      onSaveIdentity: (n: { name: string; title: string; avatar: string }) =>
        void savePersonaIdentity(personaId, n),
      nameSaving: nameSaveId === personaId,
      nameError: nameErr != null && nameErr.personaId === personaId ? nameErr.message : null,
    };
  }

  return (
    <section className="admin-agentic-live" aria-label="Live agentic hierarchy chart">
      <header className="admin-agentic-live__head">
        <div>
          <h2 className="admin-agentic-live__title">Live hierarchy · command tree</h2>
          <p className="admin-agentic-live__sub">
            Each card shows <strong>name</strong>, <strong>title</strong>, and an optional <strong>avatar</strong> (JPG/PNG
            via URL in <code>config/agents.json</code> — use <code>public/agentic-avatars/…</code> or an https link). Open
            <strong> Identity</strong> to edit.             Activity for every role (Worker → Chief) comes from the same Supabase table as
            the pipeline: <code>agentic_pipeline_stage_log</code> in the <strong>feed below</strong> (grouped by department
            — SEO, Publishing, Marketing, Chief AI, Head of Compliance — with newest entries first within each group, display
            capped at 1,000 words). Use the chart zoom bar and <strong>⌘/Ctrl + scroll</strong> on the tree. The four report
            lines stay <strong>one row</strong>; at 100% zoom the row can scale to fit. Under SEO / Publishing,{" "}
            <strong>Auto</strong> / <strong>Band</strong> reflows pillar workers in a grid as you zoom out.
          </p>
        </div>
        <div className="admin-agentic-live__cadence">
          <p className="admin-agentic-live__cadence-label">
            Publishing cadence (display slot / {snap ? Math.round(snap.publishCycleMs / 3_600_000) : 2}h)
          </p>
          <div
            className="admin-agentic-live__bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="admin-agentic-live__bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="admin-agentic-live__cadence-meta">
            Next slot boundary in <strong>{formatRemaining(msLeft)}</strong>
            {snap ? (
              <>
                {" "}
                · slot #{snap.slot.slotIndex}
              </>
            ) : null}
          </p>
          <p className="admin-agentic-live__cron-hint">
            Production: Worker cron → <code>/api/cron/agentic-publish</code> (needs{" "}
            <code>AGENTIC_CRON_SECRET</code> + <code>AGENTIC_CRON_BASE_URL</code> on Cloudflare).
          </p>
        </div>
      </header>

      {err ? <p className="admin-agentic-live__err">{err}</p> : null}

      {!snap ? <p className="admin-agentic-live__loading">Loading live snapshot…</p> : null}

      {chart && snap ? (
        <>
          <div
            className="ah-tree__toolbar"
            role="group"
            aria-label="Chart zoom and worker layout"
          >
            <div className="ah-tree__toolbar-cluster">
              <span className="ah-tree__toolbar-label">Zoom</span>
              <button
                type="button"
                className="ah-tree__zoom-btn"
                onClick={() => setZoom(chartZoom - ZOOM_STEP)}
                disabled={chartZoom <= ZOOM_MIN + 0.001}
                aria-label="Zoom out (smaller; see more of the tree)"
                title="Zoom out — fit more on screen. Tip: Cmd/Ctrl + scroll on the chart area"
              >
                −
              </button>
              <input
                className="ah-tree__zoom-range"
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={chartZoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label="Chart zoom"
              />
              <button
                type="button"
                className="ah-tree__zoom-btn"
                onClick={() => setZoom(chartZoom + ZOOM_STEP)}
                disabled={chartZoom >= ZOOM_MAX - 0.001}
                aria-label="Zoom in (larger tree)"
                title="Zoom in — larger cards and text"
              >
                +
              </button>
              <span
                className="ah-tree__zoom-pct"
                title={
                  chartZoomIsDefault && hFit < 0.99
                    ? `Slider ${Math.round(chartZoom * 100)}% · L1 org row is scaled to fit the panel (×${(hFit * 100).toFixed(0)}% width) so all four departments stay visible.`
                    : "Scale applied to the whole org chart"
                }
              >
                {Math.round(chartZoom * 100)}%
                {chartZoomIsDefault && hFit < 0.99 ? <span className="ah-tree__zoom-fit-badge">· fit</span> : null}
              </span>
              <button
                type="button"
                className="ah-tree__zoom-reset"
                onClick={() => {
                  setChartZoom(ZOOM_DEFAULT);
                  setWorkerLayout("auto");
                }}
              >
                Reset
              </button>
            </div>
            <div className="ah-tree__toolbar-cluster">
              <label className="ah-tree__toolbar-label" htmlFor="ah-worker-layout">
                Pillar workers
              </label>
              <select
                id="ah-worker-layout"
                className="ah-tree__layout-select"
                value={workerLayout}
                onChange={(e) => setWorkerLayout(e.target.value as WorkerLayoutMode)}
                title="Grid widens as you zoom out: 1 col (wide) at 100% up to 5 at min zoom. Stacked = one column."
              >
                <option value="auto">Auto (1–5 cols by zoom)</option>
                <option value="stack">Stacked (all 10 in one column)</option>
                <option value="band">Band (same reflow as Auto)</option>
              </select>
            </div>
            {bandLayoutActive ? (
              <p className="ah-tree__toolbar-hint">
                Pillar band: {bandWorkerCols} col{bandWorkerCols === 1 ? "" : "s"} (1 col while chart zoom is above 45% —
                full-width cards) · Stacked = one column.
              </p>
            ) : null}
          </div>

          <div
            className="ah-tree__scroller"
            ref={scrollerRef}
            onWheel={onChartWheel}
            tabIndex={0}
            role="region"
            aria-label="Org chart — use Cmd or Ctrl and scroll to zoom. At 100% zoom, all four departments are fitted to the panel width when possible."
          >
            <div
              className={"ah-tree" + (bandLayoutActive ? " ah-tree--band" : "")}
              style={{ zoom: effectiveTreeZoom } as CSSProperties}
              suppressHydrationWarning
            >
              <p className="ah-tree__brand">Xalura · Agentic</p>
              <PersonaPill
                persona={chart.chief}
                tier="chief"
                {...pillNameProps(chart.chief.id)}
              />
              <div className="ah-tree__l1-block" ref={l1BlockRef}>
                <div className="ah-tree__vline" aria-hidden />
                <div className="ah-tree__fork ah-tree__fork--quartet" aria-hidden />
                <div className="ah-tree__columns-outer">
                  <div
                    className={
                      "ah-tree__columns ah-tree__columns--quartet" +
                      (bandLayoutActive ? " ah-tree__columns--decompressed" : "")
                    }
                  >
                {chart.lanes.map((lane) => {
                  const isMultiPillar = lane.deptId !== "marketing" && lane.workers.length > 1;
                  const colClass =
                    "ah-tree__column" +
                    (isMultiPillar && bandLayoutActive ? " ah-tree__column--with-band" : "");
                  return (
                    <div
                      key={lane.deptId}
                      className={colClass}
                      style={isMultiPillar && bandLayoutActive ? bandColCssVars : undefined}
                    >
                      <PersonaPill
                        persona={lane.executive}
                        tier="exec"
                        {...pillNameProps(lane.executive.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <PersonaPill
                        persona={lane.manager}
                        tier="mgr"
                        {...pillNameProps(lane.manager.id)}
                      />
                      {lane.deptId === "publishing" ? (
                        <>
                          <div className="ah-tree__vline" aria-hidden />
                          <p className="ah-tree__reports-to">Reports to Publishing Manager</p>
                          <PersonaPill
                            persona={chart.publishingGraphicDesigner}
                            tier="graphic"
                            {...pillNameProps(chart.publishingGraphicDesigner.id)}
                          />
                        </>
                      ) : null}
                      {isMultiPillar && bandLayoutActive ? (
                        <div className="ah-tree__vline" aria-hidden />
                      ) : null}
                      {isMultiPillar && bandLayoutActive ? (
                        <div
                          className="ah-tree__worker-rail"
                          data-pillar="band"
                        >
                          <div className="ah-tree__worker-rail-cap" aria-hidden />
                          <div
                            className="ah-tree__worker-rail-row"
                            role="list"
                            data-ah-cols={bandWorkerCols}
                            style={bandRailRowStyle}
                            aria-label={`${lane.deptLabel} workers: ${bandWorkerCols} columns (more when chart zoomed out)`}
                          >
                            {lane.workers.map((w) => (
                              <div
                                className="ah-tree__worker-rail-item"
                                key={w.id}
                                role="listitem"
                              >
                                <div
                                  className="ah-tree__vline ah-tree__vline--rail"
                                  aria-hidden
                                />
                                <PersonaPill
                                  persona={w}
                                  tier="worker"
                                  compact
                                  {...pillNameProps(w.id)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        lane.workers.map((w) => (
                          <div key={w.id} className="ah-tree__worker-stack">
                            <div className="ah-tree__vline" aria-hidden />
                            <PersonaPill
                              persona={w}
                              tier="worker"
                              {...pillNameProps(w.id)}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
                <div className="ah-tree__column ah-tree__column--compliance">
                  <div className="ah-tree__vline" aria-hidden />
                  <PersonaPill
                    persona={chart.complianceOfficer}
                    tier="compliance"
                    {...pillNameProps(chart.complianceOfficer.id)}
                  />
                </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : snap && !chart ? (
        <p className="admin-agentic-live__loading">Chart payload missing — refresh API.</p>
      ) : null}

      {snap?.failed_hint ? (
        <p className="admin-agentic-live__warn">Last failure: {snap.failed_hint}</p>
      ) : null}

      <div className="admin-agentic-activity-feed" aria-label="Supabase agent activity from pipeline log by department">
        <h3 className="admin-agentic-activity-feed__title">Activity by department (Supabase <code>agentic_pipeline_stage_log</code>)</h3>
        <p className="admin-agentic-activity-feed__sub">
          Grouped by department, newest first within each group. Sections are ordered by most recent log time in that department.
          Display is limited to <strong>{MAX_ACTIVITY_WORDS} words</strong>; data is not deleted in the database.
          {activityWordNote != null && activityWordNote ? (
            <span className="admin-agentic-activity-feed__note"> {activityWordNote}</span>
          ) : null}
        </p>
        {activityErr != null && activityErr.trim() ? (
          <p className="admin-agentic-live__err">{activityErr}</p>
        ) : null}
        <div className="admin-agentic-activity-feed__scroll" tabIndex={0}>
          {activityItems.length === 0 && !activityErr ? (
            <p className="admin-agentic-activity-feed__empty">No log rows yet — run a pipeline (or set <code>SUPABASE_SERVICE_ROLE_KEY</code>).</p>
          ) : (
            <div className="admin-agentic-activity-feed__body">
              {activityItems.map((it, i) =>
                it.t === "section" ? (
                  <h4 key={`s-${i}-${it.label}`} className="admin-agentic-activity-feed__dept">
                    {it.label}
                  </h4>
                ) : (
                  <p key={`r-${i}`} className="admin-agentic-activity-feed__line">
                    {it.text}
                  </p>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
