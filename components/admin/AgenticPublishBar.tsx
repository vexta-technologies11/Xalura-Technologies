"use client";

import { useState } from "react";
import { readResponseJson } from "@/lib/readResponseJson";

export function AgenticPublishBar() {
  const [busy, setBusy] = useState(false);
  const [busySeo, setBusySeo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runSeoAllLanes() {
    setBusySeo(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/agentic-seo-lanes", {
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
      const approved = data["approved"];
      const lanes = data["lanes"];
      setMsg(
        `SEO sweep finished — ${String(approved ?? "0")}/${String(lanes ?? "10")} lanes approved. Keywords logged to agentic_pipeline_stage_log (event keywords_for_publishing).`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusySeo(false);
    }
  }

  async function runPublish() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/agentic-publish", {
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
      const human =
        typeof data["human_summary"] === "string" && data["human_summary"].trim()
          ? (data["human_summary"] as string)
          : null;
      if (!res.ok) {
        setErr(human ?? (typeof data["error"] === "string" ? data["error"] : res.statusText));
        return;
      }
      const pub = data["publish"] as Record<string, unknown> | undefined;
      const vert = data["vertical_label"] ?? data["vertical_id"];
      const cadence = typeof data["cadence_tick"] === "number" ? ` · cadence #${data["cadence_tick"]}` : "";
      if (pub?.["ok"] === true && typeof pub["path"] === "string") {
        setMsg(
          `Published — open ${pub["path"]} on the public site.${vert ? ` (${String(vert)})` : ""}${cadence}`,
        );
        return;
      }
      if (pub?.["skipped"] === true && typeof pub["reason"] === "string") {
        setErr(pub["reason"] as string);
        return;
      }
      if (human) {
        setErr(human);
        return;
      }
      if (typeof data["error"] === "string") {
        setErr(`${data["stage"] ? `[${String(data["stage"])}] ` : ""}${data["error"]}`);
        return;
      }
      setMsg(typeof data["result"] === "object" ? "Run finished — see response JSON." : "Done.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-agentic-publish-bar">
      <p className="admin-agentic-publish-bar__title">Publishing → live article</p>
      <p className="admin-agentic-publish-bar__hint">
        Runs <strong>one incremental queue tick</strong> (same order as hourly cron): SEO topic bank for the
        next vertical → <code>KEYWORD_READY</code> → Publishing handoff → Supabase upsert. No custom task —
        you are only <strong>overriding the schedule</strong>. Requires <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
        and the same keys as incremental (Gemini, SerpAPI topic bank, etc.).         Compliance email runs inline
        after publish when enabled (slower request, more reliable). If the topic bank file is missing or
        empty, or this vertical has no unused keyword, this run may force one Serp-backed bank refresh
        (bypasses the usual crawl cooldown for that tick only).
        <br />
        <br />
        <strong>All SEO lanes</strong> first <strong>refills the topic bank</strong> (Serp + Firecrawl + Gemini for
        each of the ten public pillars, <code>sc-…</code> ids), then runs the same incremental-style SEO task{" "}
        <strong>once per pillar</strong> on those new topics. Very long request. Pushes primary and supporting
        keywords to Supabase <code>agentic_pipeline_stage_log</code> for publishing handoff; it does{" "}
        <strong>not</strong> run Publishing or site upsert.
      </p>
      <div className="admin-agentic-publish-bar__actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy || busySeo}
          onClick={() => void runPublish()}
        >
          {busy ? "Running queue tick…" : "Run next queue tick & publish"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={busy || busySeo}
          onClick={() => void runSeoAllLanes()}
        >
          {busySeo ? "Running all SEO lanes…" : "Run all SEO lanes (topic bank → keyword logs)"}
        </button>
      </div>
      {msg ? <p className="admin-agentic-publish-bar__ok">{msg}</p> : null}
      {err ? <p className="admin-agentic-publish-bar__err">{err}</p> : null}
    </div>
  );
}
