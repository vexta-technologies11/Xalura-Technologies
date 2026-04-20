import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = createClient();
  const [{ count: empCount }, { count: partnerCount }] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("partners").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: "#52524f", marginBottom: 32 }}>
        Overview of your Xalura site configuration.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 12, color: "#737373", marginBottom: 8 }}>AI Employees</p>
          <p style={{ fontSize: 28, fontWeight: 600 }}>{empCount ?? "—"}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 12, color: "#737373", marginBottom: 8 }}>Partners</p>
          <p style={{ fontSize: 28, fontWeight: 600 }}>{partnerCount ?? "—"}</p>
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <li>
          <Link href="/admin/employees" style={{ color: "#1740e0" }}>
            Manage AI Employees →
          </Link>
        </li>
        <li>
          <Link href="/admin/content" style={{ color: "#1740e0" }}>
            Edit landing page copy →
          </Link>
        </li>
        <li>
          <Link href="/admin/partners" style={{ color: "#1740e0" }}>
            Manage partners →
          </Link>
        </li>
      </ul>
    </div>
  );
}
