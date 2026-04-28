"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import type { NewsTeamChartPayload } from "@/lib/newsTeamHierarchyChartData";
import { readResponseJson } from "@/lib/readResponseJson";
import { capNewestFirstLinesToWordBudget, countWords } from "@/lib/activityWordCap";
import type { AgentNamesConfig } from "@/xalura-agentic/lib/agentNames";
import { PersonaPill, personaFieldsFromConfig } from "./AgenticHierarchyLive";

type NewsLiveApiResponse = AgenticLiveSnapshot & { chart?: NewsTeamChartPayload };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const MAX_ACTIVITY_WORDS = 1_000;

type PipelineLogFeedRow = {
  created_at: string;
  department: string;
  agent_lane_id: string | null;
  stage: string;
  event: string;
  summary: string;
  detail?: unknown;
};

function compactOneLine(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

function formatDetailSnippet(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === "string") {
    const t = compactOneLine(detail);
    return t ? t.slice(0, 220) : null;
  }
  if (typeof detail !== "object") return null;
  const d = detail as Record<string, unknown>;
  const picks = [
    d["decision"],
    d["reason"],
    d["note"],
    d["message"],
    d["result"],
    d["status"],
  ];
  for (const p of picks) {
    if (typeof p === "string" && p.trim()) return compactOneLine(p).slice(0, 220);
  }
  try {
    const raw = compactOneLine(JSON.stringify(d));
    return raw ? raw.slice(0, 220) : null;
  } catch {
    return null;
  }
}

function isManagerDecisionRow(r: PipelineLogFeedRow): boolean {
  const s = r.stage.toLowerCase();
  const e = r.event.toLowerCase();
  return (
    s.includes("manager") ||
    e.includes("approve") ||
    e.includes("decline") ||
    e.includes("reject")
  );
}

function formatPipelineFeedRow(
  r: PipelineLogFeedRow,
): { eventLabel: string; lineText: string } {
  const t = r.created_at?.slice(0, 19)?.replace("T", " ") ?? "?";
  const eventLabel = compactOneLine(r.event || "event");
  const detailSnippet = formatDetailSnippet(r.detail);
  const useDetailOverRunId = isManagerDecisionRow(r) && !!detailSnippet;
  const lane = !useDetailOverRunId && r.agent_lane_id?.trim() ? ` / ${r.agent_lane_id.trim()}` : "";
  const detailPart = useDetailOverRunId ? ` / detail: ${detailSnippet}` : "";
  const summary = compactOneLine(r.summary || "");
  const lineText =
    `[${t}] ${r.department}${lane} / ${r.stage}${detailPart}: ${summary}`.trim();
  return { eventLabel, lineText };
}

const ZOOM_KEY = "xalura-news-hierarchy-chart-zoom";
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.45;
const ZOOM_STEP = 0.05;
const ZOOM_DEFAULT = 1;
const ZOOM_DEFAULT_TOL = 0.02;
const H_FIT_MIN = 0.18;

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

type ActivityFeedItem = { t: "row"; eventLabel: string; text: string };

export function NewsTeamHierarchyLive() {
  const [snap, setSnap] = useState<NewsLiveApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nameSaveId, setNameSaveId] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<{ personaId: string; message: string } | null>(null);
  const [nameTick, setNameTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [chartZoom, setChartZoom] = useState(ZOOM_DEFAULT);
  const [restored, setRestored] = useState(false);
  const [hFit, setHFit] = useState(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const l1BlockRef = useRef<HTMLDivElement>(null);
  const naturalL1WRef = useRef<number | null>(null);
  const prevDefaultZoomRef = useRef(false);
  const fitLayoutKeyRef = useRef("");

  useEffect(() => {
    setChartZoom(readStoredZoom());
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

  const chart = snap?.chart;
  const fitLayoutKey = useMemo(() => {
    if (!chart) return "";
    return `news|${chart.preprod.deptId},${chart.newsWriters.deptId}`;
  }, [chart]);

  useLayoutEffect(() => {
    if (fitLayoutKey && fitLayoutKeyRef.current !== fitLayoutKey) {
      naturalL1WRef.current = null;
      setHFit(1);
    }
    if (fitLayoutKey) fitLayoutKeyRef.current = fitLayoutKey;
  }, [fitLayoutKey]);

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
      const next = ratio >= 0.95 ? 1 : Math.min(1, Math.max(H_FIT_MIN, ratio));
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
  }, [chart, chartZoomIsDefault, hFit, fitLayoutKey]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/agentic-news-live", { credentials: "include" });
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
          setSnap(j as unknown as NewsLiveApiResponse);
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
    const res = await fetch("/api/admin/agentic-news-live", { credentials: "include" });
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
    setSnap(j as unknown as NewsLiveApiResponse);
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
          } as NewsLiveApiResponse;
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
        const res = await fetch("/api/admin/news-activity-feed?limit=400", { credentials: "include" });
        const parsed = await readResponseJson<{
          ok?: boolean;
          rows?: PipelineLogFeedRow[];
          error?: string;
        }>(res);
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
        const rows = j.rows.map((r) => formatPipelineFeedRow(r));
        const lines = rows.map((r) => `${r.eventLabel} ${r.lineText}`);
        const capped = capNewestFirstLinesToWordBudget(lines, MAX_ACTIVITY_WORDS);
        const before = countWords(lines.join(" "));
        const after = countWords(capped.join(" "));
        if (before > after) {
          setActivityWordNote(
            `Newest first; display trimmed to ${MAX_ACTIVITY_WORDS} words (full history in Supabase).`,
          );
        } else {
          setActivityWordNote(null);
        }
        const capCounts = new Map<string, number>();
        for (const c of capped) {
          capCounts.set(c, (capCounts.get(c) ?? 0) + 1);
        }
        const picked: ActivityFeedItem[] = [];
        for (const r of rows) {
          const key = `${r.eventLabel} ${r.lineText}`;
          const left = capCounts.get(key) ?? 0;
          if (left > 0) {
            picked.push({ t: "row", eventLabel: r.eventLabel, text: r.lineText });
            capCounts.set(key, left - 1);
          }
        }
        setActivityItems(picked);
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
    <section className="admin-agentic-live" aria-label="Live News team hierarchy chart">
      <header className="admin-agentic-live__head">
        <div>
          <h2 className="admin-agentic-live__title">News team · command tree</h2>
          <p className="admin-agentic-live__sub">
            Same layout as the main AI dashboard: Pre-Production and Writers (with Chief of Audit, Head of News, and
            Photographer), optional avatars via <code>config/agents.json</code>, and <strong>Identity</strong> to edit.             Inbound email uses the same Resend webhook as Chief: set <code>HEAD_OF_NEWS_INBOUND_TO</code> and{" "}
            <code>CHIEF_OF_AUDIT_NEWS_INBOUND_TO</code> in <code>.env.local</code> to route the To address; both roles see
            the News snapshot (pipeline + <code>news_run_events</code>) in the thread. Live
            log below merges <code>agentic_pipeline_stage_log</code> (department <code>news</code>) and{" "}
            <code>news_run_events</code> (newest first). Use the zoom bar and <strong>⌘/Ctrl + scroll</strong> on the tree.
          </p>
        </div>
        <div className="admin-agentic-live__cadence">
          <p className="admin-agentic-live__cadence-label">
            Shared cadence slot (display / {snap ? Math.round(snap.publishCycleMs / 3_600_000) : 2}h)
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
            Cron: <code>POST /api/cron/news-run</code> with <code>AGENTIC_CRON_SECRET</code> (same pipeline as the primary
            button).
          </p>
        </div>
      </header>

      {err ? <p className="admin-agentic-live__err">{err}</p> : null}

      {!snap ? <p className="admin-agentic-live__loading">Loading News team snapshot…</p> : null}

      {chart && snap ? (
        <>
          <div className="ah-tree__toolbar" role="group" aria-label="Chart zoom">
            <div className="ah-tree__toolbar-cluster">
              <span className="ah-tree__toolbar-label">Zoom</span>
              <button
                type="button"
                className="ah-tree__zoom-btn"
                onClick={() => setZoom(chartZoom - ZOOM_STEP)}
                disabled={chartZoom <= ZOOM_MIN + 0.001}
                aria-label="Zoom out"
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
                aria-label="Zoom in"
              >
                +
              </button>
              <span className="ah-tree__zoom-pct">
                {Math.round(chartZoom * 100)}%
                {chartZoomIsDefault && hFit < 0.99 ? <span className="ah-tree__zoom-fit-badge">· fit</span> : null}
              </span>
              <button
                type="button"
                className="ah-tree__zoom-reset"
                onClick={() => {
                  setChartZoom(ZOOM_DEFAULT);
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div
            className="ah-tree__scroller"
            ref={scrollerRef}
            onWheel={onChartWheel}
            tabIndex={0}
            role="region"
            aria-label="News org chart"
          >
            <div
              className="ah-tree ah-tree--news-team"
              style={{ zoom: effectiveTreeZoom } as CSSProperties}
              suppressHydrationWarning
            >
              <p className="ah-tree__brand">Xalura · News</p>
              <PersonaPill
                persona={chart.headOfNews}
                tier="chief"
                {...pillNameProps(chart.headOfNews.id)}
              />
              <div className="ah-tree__l1-block" ref={l1BlockRef}>
                <div className="ah-tree__vline" aria-hidden />
                <div className="ah-tree__fork ah-tree__fork--duo" aria-hidden />
                <div className="ah-tree__columns-outer">
                  <div className="ah-tree__columns ah-tree__columns--duo">
                    <div className="ah-tree__column">
                      <p className="ah-tree__column-title">Pre-Production</p>
                      <PersonaPill
                        persona={chart.preprod.executive}
                        tier="exec"
                        {...pillNameProps(chart.preprod.executive.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <PersonaPill
                        persona={chart.preprod.manager}
                        tier="mgr"
                        {...pillNameProps(chart.preprod.manager.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <PersonaPill
                        persona={chart.preprod.workers[0]!}
                        tier="worker"
                        {...pillNameProps(chart.preprod.workers[0]!.id)}
                      />
                    </div>
                    <div className="ah-tree__column">
                      <p className="ah-tree__column-title">Writers &amp; publish path</p>
                      <PersonaPill
                        persona={chart.newsWriters.executive}
                        tier="exec"
                        {...pillNameProps(chart.newsWriters.executive.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <PersonaPill
                        persona={chart.newsWriters.manager}
                        tier="mgr"
                        {...pillNameProps(chart.newsWriters.manager.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <p className="ah-tree__reports-to">Before site publish</p>
                      <PersonaPill
                        persona={chart.newsPhotographer}
                        tier="graphic"
                        {...pillNameProps(chart.newsPhotographer.id)}
                      />
                      <div className="ah-tree__vline" aria-hidden />
                      <PersonaPill
                        persona={chart.newsWriters.workers[0]!}
                        tier="worker"
                        {...pillNameProps(chart.newsWriters.workers[0]!.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : snap && !chart ? (
        <p className="admin-agentic-live__loading">Chart payload missing — refresh.</p>
      ) : null}

      {snap?.failed_hint ? (
        <p className="admin-agentic-live__warn">Last failure: {snap.failed_hint}</p>
      ) : null}

      <div className="admin-agentic-activity-feed" aria-label="News pipeline and run log">
        <h3 className="admin-agentic-activity-feed__title">
          Activity — <code>agentic_pipeline_stage_log</code> + <code>news_run_events</code>
        </h3>
        <p className="admin-agentic-activity-feed__sub">
          Newest first. Display up to <strong>{MAX_ACTIVITY_WORDS} words</strong>.
          {activityWordNote != null && activityWordNote ? (
            <span className="admin-agentic-activity-feed__note"> {activityWordNote}</span>
          ) : null}
        </p>
        {activityErr != null && activityErr.trim() ? (
          <p className="admin-agentic-live__err">{activityErr}</p>
        ) : null}
        <div className="admin-agentic-activity-feed__scroll" tabIndex={0}>
          {activityItems.length === 0 && !activityErr ? (
            <p className="admin-agentic-activity-feed__empty">No log rows yet.</p>
          ) : (
            <div className="admin-agentic-activity-feed__body">
              {activityItems.map((it, i) => (
                <p key={`r-${i}`} className="admin-agentic-activity-feed__line">
                  <span className="admin-agentic-activity-feed__event">{it.eventLabel}</span>
                  <span className="admin-agentic-activity-feed__text"> {it.text}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
