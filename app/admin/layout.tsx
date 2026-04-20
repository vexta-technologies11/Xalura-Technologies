import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";
import "@/components/admin/admin-ui.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <div className="admin-root">
        <div className="admin-main" style={{ paddingTop: 40 }}>
        <h1 className="admin-page-title">Admin unavailable</h1>
        <p style={{ color: "#52524f", lineHeight: 1.6 }}>
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart
          the dev server. See <code>.env.local.example</code> in the repo.
        </p>
        {children}
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="admin-root">
      <AdminNav email={user.email ?? ""} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
