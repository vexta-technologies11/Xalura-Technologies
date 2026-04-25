"use client";

import { useState } from "react";
import { readResponseJson } from "@/lib/readResponseJson";

export function NewsTeamPublishBar() {
  const [busy, setBusy] = useState(false);
  const [busyPre, setBusyPre] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runPreprodSweep() {
    setBusyPre(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/news-preprod-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      const parsed = await readResponseJson<Record<string, unknown>>(res);
      if (!parsed.ok) {
        setErr(parsed.error);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        setErr(
          typeof data["error"] === "string" ? (data["error"] as string) : res.statusText,
        );
        return;
      }
      if (data["ok"] !== true) {
        setErr(typeof data["error"] === "string" ? (data["error"] as string) : "Failed");
        return;
      }
      setMsg(
        `Pre-Production Serp+checklist sweep done — pool ${String(data["poolSize"])} · checklist ${String(
          data["checklistSize"],
        )} items. Logged to agentic_pipeline_stage_log + news_run_events.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyPre(false);
    }
  }

  async function runNewsPipeline() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/news-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      const parsed = await readResponseJson<Record<string, unknown>>(res);
      if (!parsed.ok) {
        setErr(parsed.error);
        return;
      }
      const data = parsed.data;
      if (data["ok"] === true && data["status"] === "published" && typeof data["slug"] === "string") {
        setMsg(`Published — /news/${data["slug"]} · ${String(data["title"] ?? "")}`.trim());
        return;
      }
      if (data["ok"] === false) {
        const m =
          data["message"] != null
            ? String(data["message"])
            : data["reason"] != null
              ? String(data["reason"])
              : "Run finished with issues";
        setErr(
          data["status"] != null
            ? `[${String(data["status"])}] ${m}`.trim()
            : m,
        );
        return;
      }
      setMsg("Run completed — see response in network tab if needed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-agentic-publish-bar">
      <p className="admin-agentic-publish-bar__title">News team → site publish</p>
      <p className="admin-agentic-publish-bar__hint">
        <strong>Run full news pipeline</strong> (same as cron <code>POST /api/cron/news-run</code> but with your admin
        session): Pre-Production Serp+Firecrawl → Writers (W/M) → Chief of Audit → Head of News digest → optional Leonardo
        cover when <code>LEONARDO_API_KEY</code> is set → <code>news_items</code> on the public site. Long request.
        <br />
        <br />
        <strong>Pre-Production Serp + 30-item checklist</strong> only refills the same-day news pool and checklist (no
        W/M, audit, or publish) — the News equivalent of a Serp/keyword refresh. Logs to both Supabase tables. Very long
        when Firecrawl runs.
      </p>
      <div className="admin-agentic-publish-bar__actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy || busyPre}
          onClick={() => void runNewsPipeline()}
        >
          {busy ? "Running full news pipeline…" : "Run full news pipeline & publish"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={busy || busyPre}
          onClick={() => void runPreprodSweep()}
        >
          {busyPre ? "Running Pre-Production sweep…" : "Run Pre-Production Serp + checklist (no publish)"}
        </button>
      </div>
      {msg ? <p className="admin-agentic-publish-bar__ok">{msg}</p> : null}
      {err ? <p className="admin-agentic-publish-bar__err">{err}</p> : null}
    </div>
  );
}
