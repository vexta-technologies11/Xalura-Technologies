import Link from "next/link";
import { getAllTeamMembersForAdmin } from "@/lib/teamData";

export default async function TeamMembersAdminPage() {
  const list = await getAllTeamMembersForAdmin();

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <h1 className="admin-page-title" style={{ marginBottom: 0 }}>
          Public team
        </h1>
        <Link href="/admin/team-members/new" className="admin-btn admin-btn--primary" style={{ textDecoration: "none" }}>
          Add person
        </Link>
      </div>
      <div className="admin-card admin-card-pad">
        <p className="admin-help" style={{ marginBottom: 20 }}>
          Headline and footer copy: <Link href="/admin/content">Page content → Team page</Link>. Upload JPG/PNG here.
        </p>
        {list.length === 0 ? (
          <p className="admin-help">No rows yet. Run the Supabase migration for <code>team_members</code>, then add
            your first person.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {list.map((m) => (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name || "(unnamed)"}</div>
                  <div className="admin-help" style={{ fontSize: 12 }}>
                    {m.title} · {m.department} {!m.is_active ? "· hidden" : ""}
                  </div>
                </div>
                <Link href={`/admin/team-members/${m.id}`} className="admin-btn admin-btn--secondary" style={{ textDecoration: "none" }}>
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
