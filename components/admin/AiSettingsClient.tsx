"use client";

import { useState } from "react";
import Link from "next/link";
import { generateAgentApiKey } from "@/app/admin/ai-dashboard/settings/actions";

type EmployeeRow = { id: string; name: string; role: string };
export function AiSettingsClient({
  employees,
  hasKeyByEmployee,
}: {
  employees: EmployeeRow[];
  hasKeyByEmployee: Record<string, boolean>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  async function onGenerate(employeeId: string) {
    setMsg(null);
    setBusy(employeeId);
    const res = await generateAgentApiKey(employeeId);
    setBusy(null);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setRevealed((r) => ({ ...r, [employeeId]: res.apiKey }));
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    setMsg("Copied to clipboard.");
  }

  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>
            Agent API keys
          </h1>
          <p className="admin-page-lead" style={{ marginBottom: 0 }}>
            Easiest path: one <strong>shared password</strong> in the blue box above (
            <code>INGEST_PASSWORD</code> in env). The table below is <strong>optional</strong>{" "}
            per-employee <code>xal_…</code> keys — Bearer is that key; <code>agent_id</code> must be
            the employee <strong>UUID</strong> or <strong>display name</strong> for that row.
          </p>
        </div>
        <Link href="/admin/ai-dashboard" className="admin-btn admin-btn--secondary">
          Back to dashboard
        </Link>
      </div>

      {msg ? (
        <p style={{ color: "#475569", marginBottom: 16 }} role="status">
          {msg}
        </p>
      ) : null}

      <div className="admin-card admin-card-pad">
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {employees.map((e) => {
            const hasKey = hasKeyByEmployee[e.id];
            const fullReveal = revealed[e.id];
            const displayText =
              fullReveal ?? (hasKey ? "xal_•••••••• (stored in KV — generate new to rotate)" : null);
            return (
              <li
                key={e.id}
                style={{
                  padding: "18px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 650, color: "#0f172a" }}>{e.name}</div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                      {e.role}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "0.8125rem",
                        color: "#334155",
                        wordBreak: "break-all",
                      }}
                    >
                      {displayText ? (
                        <>
                          {displayText}
                          {fullReveal ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost"
                              style={{ marginLeft: 8, padding: "4px 10px" }}
                              onClick={() => copy(fullReveal)}
                            >
                              Copy
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>No key yet</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 6 }}>
                      Agent ID (UUID): {e.id}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    disabled={busy === e.id}
                    onClick={() => void onGenerate(e.id)}
                  >
                    {hasKey ? "Regenerate key" : "Generate key"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
