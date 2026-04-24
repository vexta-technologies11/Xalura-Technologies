"use client";

import { useEffect, useState } from "react";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";
import type { HierarchyChartPayload, HierarchyPersona } from "@/lib/agenticHierarchyChartData";

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

function PersonaPill(props: {
  persona: HierarchyPersona;
  tier: "chief" | "exec" | "mgr" | "worker";
  narrative?: string;
}) {
  const { persona, tier, narrative } = props;
  const tierClass =
    tier === "chief"
      ? "ah-pill--chief"
      : tier === "exec"
        ? "ah-pill--exec"
        : tier === "mgr"
          ? "ah-pill--mgr"
          : "ah-pill--worker";
  const demo = persona.source === "example" ? " ah-pill--demo" : "";
  return (
    <div className={`ah-pill ${tierClass}${demo}`}>
      <div className="ah-pill__avatar" aria-hidden>
        {initials(persona.displayName)}
      </div>
      <div className="ah-pill__body">
        <div className="ah-pill__name">{persona.displayName}</div>
        <div className="ah-pill__role">{persona.position}</div>
        <div className="ah-pill__subdesk">{persona.subtitle}</div>
        <span
          className={
            persona.source === "live"
              ? "ah-pill__pilltag ah-pill__pilltag--live"
              : "ah-pill__pilltag ah-pill__pilltag--demo"
          }
        >
          {persona.source === "live" ? "Live data" : "Example motion"}
        </span>
        {narrative?.trim() ? (
          <p className="ah-pill__mono ah-pill__mono--gemini">{narrative.trim()}</p>
        ) : null}
        <p className="ah-pill__mono">{persona.facts}</p>
        {persona.managerChecklist?.trim() ? (
          <pre className="ah-pill__check">{persona.managerChecklist}</pre>
        ) : null}
      </div>
    </div>
  );
}

export function AgenticHierarchyLive() {
  const [snap, setSnap] = useState<LiveApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/agentic-live", { credentials: "include" });
        const j = (await res.json()) as Record<string, unknown>;
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

  const msLeft =
    snap != null ? Math.max(0, new Date(snap.slot.endsAt).getTime() - now) : 0;
  const pct =
    snap != null && snap.publishCycleMs > 0
      ? Math.min(100, Math.round((1 - msLeft / snap.publishCycleMs) * 100))
      : 0;

  const chart = snap?.chart;
  const narr = chart?.narratives;

  return (
    <section className="admin-agentic-live" aria-label="Live agentic hierarchy chart">
      <header className="admin-agentic-live__head">
        <div>
          <h2 className="admin-agentic-live__title">Live hierarchy · command tree</h2>
          <p className="admin-agentic-live__sub">
            Each card pulls <strong>real</strong> queue events, cycle logs under{" "}
            <code>xalura-agentic/logs/&lt;dept&gt;/cycle-*.md</code> (manager checklist + reason), and
            optional Gemini monologues when <code>GEMINI_API_KEY</code> is set on the server.
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
        <div className="ah-tree">
          <p className="ah-tree__brand">Xalura · Agentic</p>
          <PersonaPill persona={chart.chief} tier="chief" narrative={narr?.[chart.chief.id]} />
          <div className="ah-tree__vline" aria-hidden />
          <div className="ah-tree__fork" aria-hidden />
          <div className="ah-tree__columns">
            {chart.lanes.map((lane) => (
              <div key={lane.deptId} className="ah-tree__column">
                <PersonaPill
                  persona={lane.executive}
                  tier="exec"
                  narrative={narr?.[lane.executive.id]}
                />
                <div className="ah-tree__vline" aria-hidden />
                <PersonaPill
                  persona={lane.manager}
                  tier="mgr"
                  narrative={narr?.[lane.manager.id]}
                />
                <div className="ah-tree__vline" aria-hidden />
                <PersonaPill
                  persona={lane.worker}
                  tier="worker"
                  narrative={narr?.[lane.worker.id]}
                />
              </div>
            ))}
          </div>
        </div>
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
