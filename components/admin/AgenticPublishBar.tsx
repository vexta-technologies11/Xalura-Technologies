"use client";

import { useState } from "react";
import { AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK } from "@/lib/agenticDefaultPublishTask";

export function AgenticPublishBar() {
  const [task, setTask] = useState(AGENTIC_ADMIN_DEFAULT_PUBLISH_TASK);
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
        body: JSON.stringify({ task }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setErr(typeof data["error"] === "string" ? data["error"] : res.statusText);
        return;
      }
      const pub = data["publish"] as Record<string, unknown> | undefined;
      if (pub?.["ok"] === true && typeof pub["path"] === "string") {
        setMsg(`Published — open ${pub["path"]} on the public site.`);
        return;
      }
      if ((data["result"] as Record<string, unknown> | undefined)?.["status"] === "rejected") {
        setErr("Publishing pipeline rejected this run (see Manager output in logs).");
        return;
      }
      setMsg(typeof data["result"] === "object" ? "Run finished — no publish (not approved)." : "Done.");
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
        Runs the publishing agent once and upserts Supabase (same as <code>publishToSite</code> via API).
        Requires <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server. After a successful publish, optional
        compliance email (Resend) runs in the background if{" "}
        <code>AGENTIC_COMPLIANCE_ON_PUBLISH</code> or <code>AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH</code> is
        enabled — same path as cron/API publishes.
      </p>
      <textarea
        className="admin-agentic-publish-bar__task"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={4}
        disabled={busy}
        spellCheck={false}
      />
      <div className="admin-agentic-publish-bar__actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={() => void runPublish()}
        >
          {busy ? "Running…" : "Run & publish to site"}
        </button>
      </div>
      {msg ? <p className="admin-agentic-publish-bar__ok">{msg}</p> : null}
      {err ? <p className="admin-agentic-publish-bar__err">{err}</p> : null}
    </div>
  );
}
