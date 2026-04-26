"use client";

import { useState } from "react";
import { readResponseJson } from "@/lib/readResponseJson";

export function MarketingZernioBar() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runPost(force: boolean) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/marketing-zernio-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force }),
      });
      const parsed = await readResponseJson<{
        ok?: boolean;
        error?: string;
        result?: {
          ok?: boolean;
          skipped?: boolean;
          reason?: string;
          error?: string;
          slug?: string;
          title?: string;
          zernioStatus?: number;
          preview?: string;
        };
        force?: boolean;
      }>(res);
      if (!parsed.ok) {
        setErr(parsed.error);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        const e =
          data && typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : res.statusText;
        setErr(e);
        return;
      }
      const r = data?.result;
      if (!r) {
        setMsg("No result payload.");
        return;
      }
      if ("ok" in r && r.ok) {
        setMsg(
          `Posted to Zernio (HTTP ${r.zernioStatus}) — “${(r.title ?? r.slug ?? "").slice(0, 80)}”. ` +
            `A row was added to agentic_pipeline_stage_log; Chief can answer “when next in CST” from the Marketing Zernio schedule block and recent log lines.`,
        );
        return;
      }
      if ("skipped" in r && r.skipped) {
        setErr(`Skipped: ${r.reason ?? "unknown"}`);
        return;
      }
      if (r.error) {
        setErr(r.error);
        return;
      }
      setMsg("Done — see result JSON in network tab for details.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-marketing-zernio-bar">
      <p className="admin-marketing-zernio-bar__title">Marketing → Zernio (social)</p>
      <p className="admin-marketing-zernio-bar__hint">
        Picks a recent article, generates a short caption, posts via Zernio. By default, posts go to{" "}
        <strong>every active</strong> connected Zernio account (GET /v1/accounts), unless you set a queue
        profile or <code> ZERNIO_POST_PLATFORMS_JSON</code>. Set{" "}
        <code> ZERNIO_POST_ALL_ACTIVE_ACCOUNTS=false</code> to require explicit targets. Each
        run logs to{" "}
        <code>agentic_pipeline_stage_log</code> with the <strong>next post window in America/Chicago</strong> so
        Chief email can say when the marketing desk may post again. <strong>Force</strong> bypasses the 35h
        cooldown and the <code>AGENTIC_MARKETING_ZERNIO_POST</code> flag.
      </p>
      <div className="admin-marketing-zernio-bar__actions">
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={busy}
          onClick={() => void runPost(false)}
        >
          {busy ? "Running…" : "Post now (respect cooldown + flag)"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={() => void runPost(true)}
        >
          {busy ? "Running…" : "Force post now (bypass cooldown & flag)"}
        </button>
      </div>
      {msg ? <p className="admin-marketing-zernio-bar__ok">{msg}</p> : null}
      {err ? <p className="admin-marketing-zernio-bar__err">{err}</p> : null}
    </div>
  );
}
