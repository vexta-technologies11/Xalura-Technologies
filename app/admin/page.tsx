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
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-lead">Overview of your Xalura site configuration.</p>
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">AI Employees</p>
          <p className="admin-stat-value">{empCount ?? "—"}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Partners</p>
          <p className="admin-stat-value">{partnerCount ?? "—"}</p>
        </div>
      </div>
      <ul className="admin-link-list">
        <li>
          <Link href="/admin/employees">Manage AI Employees →</Link>
        </li>
        <li>
          <Link href="/admin/content">Edit homepage →</Link>
        </li>
        <li>
          <Link href="/admin/partners">Manage partners →</Link>
        </li>
      </ul>
    </div>
  );
}
