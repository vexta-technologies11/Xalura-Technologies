"use client";

import { useEffect, useState } from "react";
import type { AgenticLiveSnapshot } from "@/lib/agenticLiveSnapshot";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function AgenticHierarchyLive() {
  const [snap, setSnap] = useState<AgenticLiveSnapshot | null>(null);
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
          setSnap(j as unknown as AgenticLiveSnapshot);
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

  return (
    <section className="admin-agentic-live" aria-label="Live agentic hierarchy">
      <header className="admin-agentic-live__head">
        <div>
          <h2 className="admin-agentic-live__title">Live hierarchy · departments</h2>
          <p className="admin-agentic-live__sub">
            Worker → Manager (approve / decline) → Executive (handoff). Rows below mirror your
            command tree — edit names and titles there; they stay in this browser. Gold = example
            motion when no recent queue event for that lane; cyan = driven by the agentic event log.
          </p>
        </div>
        <div className="admin-agentic-live__cadence">
          <p className="admin-agentic-live__cadence-label">
            Publishing cadence (display slot / {snap ? Math.round(snap.publishCycleMs / 3_600_000) : 2}h)
          </p>
          <div className="admin-agentic-live__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
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
            Production: Worker cron every 2h UTC → <code>/api/cron/agentic-publish</code> (needs{" "}
            <code>AGENTIC_CRON_SECRET</code> + <code>AGENTIC_CRON_BASE_URL</code> on Cloudflare).
          </p>
        </div>
      </header>

      {err ? <p className="admin-agentic-live__err">{err}</p> : null}

      <div className="admin-agentic-live__grid">
        {(snap?.departments ?? []).map((d) => (
          <article key={d.id} className="admin-agentic-live__card">
            <div className="admin-agentic-live__card-head">
              <h3 className="admin-agentic-live__card-title">{d.label}</h3>
              <span
                className={
                  d.source === "live"
                    ? "admin-agentic-live__pill admin-agentic-live__pill--live"
                    : "admin-agentic-live__pill admin-agentic-live__pill--demo"
                }
              >
                {d.source === "live" ? "Live" : "Example"}
              </span>
            </div>
            <dl className="admin-agentic-live__dl">
              <div>
                <dt>Worker</dt>
                <dd>{d.worker}</dd>
              </div>
              <div>
                <dt>Manager</dt>
                <dd>{d.manager}</dd>
              </div>
              <div>
                <dt>Executive</dt>
                <dd>{d.executive}</dd>
              </div>
            </dl>
            <p className="admin-agentic-live__cycle">
              Cycle · approvals in window {d.cycle.approvalsInWindow}/10 · audits {d.cycle.auditsCompleted}
            </p>
          </article>
        ))}
        {!snap ? (
          <p className="admin-agentic-live__loading">Loading live snapshot…</p>
        ) : null}
      </div>

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
