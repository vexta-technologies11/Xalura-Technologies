import Link from "next/link";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import {
  getEmployees,
  getPageContent,
} from "@/lib/data";
import {
  getApprovedAgentUpdates,
  getWorkloadDailySince,
} from "@/lib/data-dashboard";

export const metadata = {
  title: "Dashboard · Xalura Tech",
  description:
    "Approved agent activity and workload — what the AI team shipped recently.",
};

export default async function PublicDashboardPage() {
  const [pageContent, employees, activity, workload] = await Promise.all([
    getPageContent(),
    getEmployees(),
    getApprovedAgentUpdates(40),
    (async () => {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 14);
      return getWorkloadDailySince(since.toISOString().slice(0, 10));
    })(),
  ]);

  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const dailyMap = new Map<string, number>();
  for (const w of workload) {
    dailyMap.set(w.day, (dailyMap.get(w.day) ?? 0) + w.update_count);
  }
  const days = Array.from(dailyMap.keys()).sort();
  const dailyTotals = days.map((day) => ({
    day,
    total: dailyMap.get(day) ?? 0,
  }));
  const maxDaily = Math.max(1, ...dailyTotals.map((d) => d.total));

  const byAgent = new Map<string, number>();
  for (const w of workload) {
    byAgent.set(w.employee_id, (byAgent.get(w.employee_id) ?? 0) + w.update_count);
  }

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap">
        <p className="label r">Live overview</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          Team dashboard
        </h1>
        <p className="body-text r" style={{ marginBottom: 40, maxWidth: 640 }}>
          Approved updates only — what Mochi, Maldita, Kimmy, and Milka completed
          recently, without digging through raw logs.
        </p>

        <div className="dash-grid r" style={{ marginBottom: 48 }}>
          <div className="dash-card">
            <h4 className="dash-title">Workload (14 days)</h4>
            <p className="dash-body" style={{ marginBottom: 16 }}>
              Total approved updates counted per day across agents.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 6,
                height: 120,
              }}
              aria-label="Daily workload"
            >
              {dailyTotals.length === 0 ? (
                <span style={{ color: "var(--mid)", fontSize: 14 }}>
                  No data yet — activity appears after admin approval.
                </span>
              ) : (
                dailyTotals.map(({ day, total }) => (
                  <div
                    key={day}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: `${Math.max(12, (total / maxDaily) * 100)}%`,
                      borderRadius: "6px 6px 2px 2px",
                      background:
                        "linear-gradient(180deg, #1740e0 0%, #6366f1 100%)",
                      position: "relative",
                    }}
                    title={`${day}: ${total}`}
                  >
                    <span
                      style={{
                        position: "absolute",
                        bottom: -20,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        color: "var(--gray)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {day.slice(5).replace("-", "/")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="dash-card">
            <h4 className="dash-title">By agent</h4>
            <p className="dash-body" style={{ marginBottom: 12 }}>
              Approved workload in this window.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {employees.map((e) => (
                <li
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 15,
                  }}
                >
                  <span>{e.name}</span>
                  <strong>{byAgent.get(e.id) ?? 0}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className="h2 r" style={{ fontSize: "clamp(28px, 5vw, 44px)", marginBottom: 20 }}>
          Recent approved activity
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
          {activity.length === 0 ? (
            <li style={{ color: "var(--mid)" }}>Nothing published here yet.</li>
          ) : (
            activity.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: "20px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gray)",
                    marginBottom: 8,
                  }}
                >
                  {nameById.get(a.employee_id ?? "") ??
                    a.agent_external_id ??
                    "Agent"}{" "}
                  ·{" "}
                  {new Date(a.created_at).toLocaleString()}
                </div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{a.activity_text}</p>
              </li>
            ))
          )}
        </ul>

        <p className="body-text" style={{ marginTop: 48 }}>
          <Link href="/" className="btn-dark" style={{ display: "inline-block" }}>
            Back to home
          </Link>
        </p>
      </section>
    </PublicPageShell>
  );
}
