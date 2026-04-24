"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import type {
  HierarchyChartPayload,
  HierarchyPersona,
} from "@/lib/agenticHierarchyChartData";
import type { PersonaActivityEntry } from "@/lib/agenticPersonaActivity";
import { readResponseJson } from "@/lib/readResponseJson";
import type { AgentNamesConfig } from "@/xalura-agentic/lib/agentNames";

type LiveApiResponse = AgenticLiveSnapshot & { chart?: HierarchyChartPayload };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function initials(name: string): string {
  const parts = name.replace(/\s+/g, " ").trim().split(" ");
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  const p = parts[0] ?? "?";
  return p.slice(0, 2).toUpperCase();
}

const ACTIVITY_KIND_LABEL: Record<string, string> = {
  worker_output: "Worker output",
  manager_decision: "Manager decision",
  executive_audit: "Executive / audit window",
  chief_audit: "Chief / audit",
  publish_event: "Publish / handoff",
  note: "Note",
};

function activityKindLabel(kind: string): string {
  return ACTIVITY_KIND_LABEL[kind] ?? kind.replace(/_/g, " ");
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

function nameFieldFromConfig(names: AgentNamesConfig | undefined, personaId: string): string {
  if (!names) return "";
  if (personaId === "chief") return names.chiefAI.name ?? "";
  if (personaId === "compliance_officer") return names.complianceOfficer?.name ?? "";
  if (personaId === "publishing_graphic_designer") return names.graphicDesigner?.name ?? "";
  const pillar = /^(seo|publishing)_worker_(.+)$/.exec(personaId);
  if (pillar) {
    const d = pillar[1] as "seo" | "publishing";
    const lane = pillar[2] ?? "";
    return names.departments[d]?.workersByPillar?.[lane]?.name ?? "";
  }
  const m = /^(marketing|publishing|seo)_(worker|manager|executive)$/.exec(personaId);
  if (m) {
    const d = m[1] as keyof typeof names.departments;
    const r = m[2] as "worker" | "manager" | "executive";
    return names.departments[d]![r].name ?? "";
  }
  return "";
}

function PersonaPill(props: {
  persona: HierarchyPersona;
  tier: "chief" | "exec" | "mgr" | "worker" | "compliance" | "graphic";
  lastActionSummary: string;
  activity: PersonaActivityEntry[];
  configName?: string;
  configNameKey?: string;
  onSaveDisplayName?: (name: string) => void | Promise<void>;
  nameSaving?: boolean;
  nameError?: string | null;
  /** Tighter card for pillar grid (SEO / Publishing) */
  compact?: boolean;
}) {
  const {
    persona,
    tier,
    lastActionSummary,
    activity,
    configName,
    configNameKey,
    onSaveDisplayName,
    nameSaving,
    nameError,
    compact,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
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
  const bandTight = Boolean(compact && tier === "worker");
  return (
    <div className={`ah-pill ${tierClass}${demo}${comp}`}>
      <div className="ah-pill__avatar" aria-hidden>
        {initials(persona.displayName)}
      </div>
      <div className="ah-pill__body">
        <div className="ah-pill__name">{persona.displayName}</div>
        {onSaveDisplayName != null && configNameKey != null ? (
          <div className={bandTight ? "ah-pill__nameform ah-pill__nameform--band" : "ah-pill__nameform"}>
            <label className="ah-pill__nameform-label" htmlFor={`ah-name-${persona.id}`}>
              {bandTight ? "Name" : "Name in config"}
            </label>
            <div className="ah-pill__nameform-row">
              <input
                id={`ah-name-${persona.id}`}
                ref={inputRef}
                className="ah-pill__nameform-input"
                name={`name-${persona.id}`}
                type="text"
                placeholder="(optional) display name for prompts"
                key={configNameKey}
                defaultValue={configName ?? ""}
                autoComplete="off"
                disabled={nameSaving}
              />
              <button
                type="button"
                className="ah-pill__nameform-btn"
                disabled={nameSaving}
                onClick={() => void onSaveDisplayName?.(inputRef.current?.value ?? "")}
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
        ) : null}
        <div className="ah-pill__role">{persona.position}</div>
        {bandTight ? null : <div className="ah-pill__subdesk">{persona.subtitle}</div>}
        {bandTight ? null : (
          <span
            className={
              persona.source === "live"
                ? "ah-pill__pilltag ah-pill__pilltag--live"
                : "ah-pill__pilltag ah-pill__pilltag--demo"
            }
          >
            {persona.source === "live" ? "Live data" : "Example motion"}
          </span>
        )}
        {lastActionSummary.trim() ? (
          <p
            className={bandTight ? "ah-pill__last-action ah-pill__last-action--band" : "ah-pill__last-action"}
          >
            {lastActionSummary.trim()}
          </p>
        ) : null}
        {bandTight ? null : (
          <details className="ah-pill__activity">
            <summary>Activity log (last {activity.length} · newest first)</summary>
            {activity.length === 0 ? (
              <p className="ah-pill__activity-empty">
                No log lines yet. After cycles run, excerpts appear from <code>logs/…/cycle-*.md</code>, audit files, and
                the event queue.
              </p>
            ) : (
              <ol className="ah-pill__activity-list">
                {activity.map((a, i) => (
                  <li key={`${a.source}-${a.at}-${i}`}>
                    <div className="ah-pill__activity-meta">
                      <time dateTime={a.at}>{new Date(a.at).toLocaleString()}</time>
                      <span className="ah-pill__activity-kind">{activityKindLabel(a.kind)}</span>
                      <code className="ah-pill__activity-src" title={a.source}>
                        {a.source}
                      </code>
                    </div>
                    <div className="ah-pill__activity-label">{a.label}</div>
                    {a.detail?.trim() ? (
                      <p className="ah-pill__activity-detail">{a.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </details>
        )}
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

  async function saveDisplayName(personaId: string, name: string) {
    setNameErr(null);
    setNameSaveId(personaId);
    try {
      const res = await fetch("/api/admin/agentic-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ personaId, name }),
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

  const act = chart?.personaActivity;
  const lastSum = chart?.lastActionSummaries;
  const agentNames = chart?.agentNames;

  function pillNameProps(personaId: string) {
    const raw = nameFieldFromConfig(agentNames, personaId);
    return {
      configName: raw,
      configNameKey: `${nameTick}-${raw}`,
      onSaveDisplayName: (n: string) => void saveDisplayName(personaId, n),
      nameSaving: nameSaveId === personaId,
      nameError:
        nameErr != null && nameErr.personaId === personaId ? nameErr.message : null,
    };
  }

  return (
    <section className="admin-agentic-live" aria-label="Live agentic hierarchy chart">
      <header className="admin-agentic-live__head">
        <div>
          <h2 className="admin-agentic-live__title">Live hierarchy · command tree</h2>
          <p className="admin-agentic-live__sub">
            Top line on each card: <strong>last action</strong> in plain English (Gemini when{" "}
            <code>GEMINI_API_KEY</code> is set; otherwise a short line from the latest log). Below: up to 20 log rows
            (newest first). Names save to <code>xalura-agentic/config/agents.json</code>. Use the chart zoom bar and{" "}
            <strong>⌘/Ctrl + scroll</strong> over the tree to scale. The four report lines (SEO, Publishing, Marketing, Head of
            Compliance) stay <strong>one row</strong> — at <strong>100% chart zoom</strong> the full row scales to fit the
            panel; pan if you zoom in, or the window is very small.{" "}
            <strong>Zoom out</strong> to see the full chart; cards keep full text (no cut-off boxes). Under SEO / Publishing,{" "}
            <strong>Auto</strong> / <strong>Band</strong> use a <strong>responsive grid</strong>: <strong>1 column</strong> at
            100% zoom (wide cards), widening to <strong>2 → 5 columns</strong> as you <strong>zoom out</strong> (35% = two
            rows of five for 10 workers). Cards always fill the pillar width. Manager checklists are off; worker cards stay
            compact.
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
                lastActionSummary={lastSum?.[chart.chief.id] ?? ""}
                activity={act?.[chart.chief.id] ?? []}
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
                        lastActionSummary={lastSum?.[lane.executive.id] ?? ""}
                        activity={act?.[lane.executive.id] ?? []}
                        {...pillNameProps(lane.executive.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <PersonaPill
                        persona={lane.manager}
                        tier="mgr"
                        lastActionSummary={lastSum?.[lane.manager.id] ?? ""}
                        activity={act?.[lane.manager.id] ?? []}
                        {...pillNameProps(lane.manager.id)}
                      />
                      {lane.deptId === "publishing" ? (
                        <>
                          <div className="ah-tree__vline" aria-hidden />
                          <p className="ah-tree__reports-to">Reports to Publishing Manager</p>
                          <PersonaPill
                            persona={chart.publishingGraphicDesigner}
                            tier="graphic"
                            lastActionSummary={lastSum?.[chart.publishingGraphicDesigner.id] ?? ""}
                            activity={act?.[chart.publishingGraphicDesigner.id] ?? []}
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
                                  lastActionSummary={lastSum?.[w.id] ?? ""}
                                  activity={act?.[w.id] ?? []}
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
                              lastActionSummary={lastSum?.[w.id] ?? ""}
                              activity={act?.[w.id] ?? []}
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
                    lastActionSummary={lastSum?.[chart.complianceOfficer.id] ?? ""}
                    activity={act?.[chart.complianceOfficer.id] ?? []}
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

      {snap && snap.tail.length > 0 ? (
        <details className="admin-agentic-live__tail">
          <summary>Recent agentic events ({snap.tail.length})</summary>
          <ul>
            {snap.tail.map((t, i) => (
              <li key={`${t.ts}-${i}`}>
                <span className="admin-agentic-live__tail-type">{t.type}</span>{" "}
                <time dateTime={t.ts}>{new Date(t.ts).toLocaleString()}</time>
                <br />
                <span className="admin-agentic-live__tail-sum">{t.summary}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
