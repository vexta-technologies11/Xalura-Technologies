"use client";

import { useState } from "react";

export function AgenticPublishBar() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setErr(typeof data["error"] === "string" ? data["error"] : res.statusText);
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
      if (typeof data["error"] === "string") {
        setErr(`${data["stage"] ? `[${data["stage"]}] ` : ""}${data["error"]}`);
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
        and the same keys as incremental (Gemini, SerpAPI topic bank, etc.). Compliance email runs inline
        after publish when enabled (slower request, more reliable).
      </p>
      <div className="admin-agentic-publish-bar__actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={() => void runPublish()}
        >
          {busy ? "Running queue tick…" : "Run next queue tick & publish"}
        </button>
      </div>
      {msg ? <p className="admin-agentic-publish-bar__ok">{msg}</p> : null}
      {err ? <p className="admin-agentic-publish-bar__err">{err}</p> : null}
    </div>
  );
}
