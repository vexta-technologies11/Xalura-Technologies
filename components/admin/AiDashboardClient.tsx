"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { approveAgentUpdate } from "@/app/admin/ai-dashboard/actions";
import type { AgentUpdateRow } from "@/types/agent-dashboard";

type EmployeeMini = { id: string; name: string };

type WorkloadRow = {
  employee_id: string;
  day: string;
  update_count: number;
};

function formatDay(d: string) {
  try {
    const [, m, day] = d.split("-").map(Number);
    return `${m}/${day}`;
  } catch {
    return d;
  }
}

export function AiDashboardClient({
  initialUpdates,
  employees,
  workload,
}: {
  initialUpdates: AgentUpdateRow[];
  employees: EmployeeMini[];
  workload: WorkloadRow[];
}) {
  const router = useRouter();
  const [updates, setUpdates] = useState<AgentUpdateRow[]>(initialUpdates);
  const [workloadState, setWorkloadState] = useState<WorkloadRow[]>(workload);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setWorkloadState(workload);
  }, [workload]);

  useEffect(() => {
    setUpdates(initialUpdates);
  }, [initialUpdates]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  function rowAgentLabel(u: AgentUpdateRow): string {
    if (u.employee_id) {
      return (
        nameById.get(u.employee_id) ??
        (u.agent_external_id?.trim() || "Agent")
      );
    }
    if (u.agent_external_id?.trim()) {
      return `${u.agent_external_id.trim()} (not registered yet)`;
    }
    return "Unknown agent";
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("agent_updates_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_updates" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setUpdates((prev) => [payload.new as AgentUpdateRow, ...prev]);
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as AgentUpdateRow;
            setUpdates((prev) =>
              prev.map((u) => (u.id === row.id ? row : u)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const pending = updates.filter((u) => u.review_status === "pending");
  const approvedHistory = updates.filter((u) => u.review_status === "approved");

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workloadState) {
      map.set(w.day, (map.get(w.day) ?? 0) + w.update_count);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((day) => ({ day, total: map.get(day) ?? 0 }));
  }, [workloadState]);

  const maxDaily = useMemo(
    () => Math.max(1, ...dailyTotals.map((d) => d.total)),
    [dailyTotals],
  );

  const byAgent = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workloadState) {
      map.set(
        w.employee_id,
        (map.get(w.employee_id) ?? 0) + w.update_count,
      );
    }
    const rows = employees.map((e) => ({
      id: e.id,
      name: e.name,
      count: map.get(e.id) ?? 0,
    }));
    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows, max };
  }, [workloadState, employees]);

  async function decline(id: string) {
    setErr(null);
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("agent_updates")
      .update({
        review_status: "declined",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setUpdates((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              review_status: "declined",
              reviewed_at: new Date().toISOString(),
            }
          : u,
      ),
    );
    router.refresh();
  }

  async function approve(id: string) {
    setErr(null);
    setBusyId(id);
    const res = await approveAgentUpdate(id);
    setBusyId(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>
            AI Dashboard Manager
          </h1>
          <p className="admin-page-lead" style={{ marginBottom: 0 }}>
            Pending updates can arrive for any <code>agent_id</code> when you use{" "}
            <code>AGENT_INGEST_SECRET</code>. Approve to register a new name in
            Supabase (or match an existing employee by name) and publish to the
            public dashboard.
          </p>
        </div>
        <div className="admin-toolbar-actions">
          <Link
            href="/admin/ai-dashboard/settings"
            className="admin-btn admin-btn--secondary"
          >
            API keys
          </Link>
        </div>
      </div>

      {err ? (
        <p style={{ color: "#b91c1c", marginBottom: 16 }} role="alert">
          {err}
        </p>
      ) : null}

      <div className="admin-ai-grid">
        <div className="admin-card admin-card-pad">
          <p className="admin-badge admin-badge--muted" style={{ marginBottom: 12 }}>
            Workload (approved updates / day)
          </p>
          <div className="admin-ai-bars" aria-label="Daily workload chart">
            {dailyTotals.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                No workload data yet. Approve updates to populate this chart.
              </p>
            ) : (
              dailyTotals.map(({ day, total }) => (
                <div
                  key={day}
                  className="admin-ai-bar"
                  style={{
                    height: `${Math.max(8, (total / maxDaily) * 100)}%`,
                  }}
                  title={`${day}: ${total}`}
                >
                  <span>{formatDay(day)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-card admin-card-pad">
          <p className="admin-badge admin-badge--muted" style={{ marginBottom: 12 }}>
            By agent (period)
          </p>
          <div className="admin-ai-breakdown">
            {byAgent.rows.map((r) => (
              <div key={r.id}>
                <div className="admin-ai-breakdown-row">
                  <span>{r.name}</span>
                  <span style={{ fontWeight: 650 }}>{r.count}</span>
                </div>
                <div className="admin-ai-breakdown-bar">
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${(r.count / byAgent.max) * 100}%`,
                      background: "#0f172a",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card admin-card-pad" style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <p className="admin-badge">Pending review ({pending.length})</p>
        </div>
        <div className="admin-pending-list">
          {pending.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9375rem" }}>
              No pending updates. POST to{" "}
              <code style={{ fontSize: "0.85em" }}>/api/agent-update</code> with
              Bearer <code>AGENT_INGEST_SECRET</code> or a per-agent key.
            </p>
          ) : (
            pending.map((u) => (
              <div key={u.id} className="admin-pending-item">
                <div className="admin-pending-meta">
                  {rowAgentLabel(u)} · {u.activity_type} ·{" "}
                  {new Date(u.created_at).toLocaleString()}
                </div>
                <p style={{ margin: 0, lineHeight: 1.55, color: "#0f172a" }}>
                  {u.activity_text}
                </p>
                <div className="admin-pending-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    disabled={busyId === u.id}
                    onClick={() => void approve(u.id)}
                  >
                    Approve & register
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    disabled={busyId === u.id}
                    onClick={() => void decline(u.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-card admin-card-pad" style={{ marginTop: 20 }}>
        <p className="admin-badge admin-badge--muted" style={{ marginBottom: 12 }}>
          Activity history (recent)
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {updates.slice(0, 40).map((u) => (
            <li
              key={u.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
                fontSize: "0.875rem",
                color: "#334155",
              }}
            >
              <strong style={{ color: "#0f172a" }}>{rowAgentLabel(u)}</strong>
              {" · "}
              <span
                style={{
                  color:
                    u.review_status === "approved"
                      ? "#15803d"
                      : u.review_status === "declined"
                        ? "#b91c1c"
                        : "#ca8a04",
                }}
              >
                {u.review_status}
              </span>
              {" · "}
              {new Date(u.created_at).toLocaleString()}
              <div style={{ marginTop: 6 }}>{u.activity_text}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-card admin-card-pad" style={{ marginTop: 20 }}>
        <p className="admin-badge admin-badge--muted" style={{ marginBottom: 12 }}>
          Daily summaries (approved)
        </p>
        {approvedHistory.length === 0 ? (
          <p style={{ color: "#64748b" }}>No approved entries yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {approvedHistory.slice(0, 20).map((u) => (
              <li
                key={u.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #e2e8f0",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {rowAgentLabel(u)} ·{" "}
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
                {u.activity_text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
