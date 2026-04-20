import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeesAdminPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("employees")
    .select("*")
    .order("display_order");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>AI Employees</h1>
        <Link
          href="/admin/employees/new"
          style={{
            background: "#0a0a0a",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 100,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Add New Employee
        </Link>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #e5e5e5", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e5e5", textAlign: "left" }}>
              <th style={{ padding: 12 }}>Name</th>
              <th style={{ padding: 12 }}>Role</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Order</th>
              <th style={{ padding: 12 }} />
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((e: { id: string; name: string; role: string; is_active: boolean; display_order: number }) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 12 }}>{e.name}</td>
                <td style={{ padding: 12 }}>{e.role}</td>
                <td style={{ padding: 12 }}>{e.is_active ? "Active" : "Inactive"}</td>
                <td style={{ padding: 12 }}>{e.display_order}</td>
                <td style={{ padding: 12 }}>
                  <Link href={`/admin/employees/${e.id}`} style={{ color: "#1740e0" }}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
