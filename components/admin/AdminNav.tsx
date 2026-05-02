"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/ai-dashboard", label: "AI Dashboard" },
  { href: "/admin/ai-news-dashboard", label: "News team" },
  { href: "/admin/employees", label: "AI Employees" },
  { href: "/admin/team-members", label: "Public team" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/content", label: "Page Content" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/tool-categories", label: "Tool Categories" },
];

export function AdminNav({ email }: { email: string }) {
  const router = useRouter();

  async function signOut() {
    // Clear admin cookie (if logged in via secret URL)
    document.cookie = 'xalura_admin_token=; max-age=0; path=/';
    document.cookie = 'xalura_is_admin=; max-age=0; path=/';
    
    // Also try Supabase sign-out (if logged in via email)
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase may not be configured
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="admin-nav">
      <nav className="admin-nav-links">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="admin-nav-link">
            {l.label}
          </Link>
        ))}
        <Link
          href="/admin"
          className="admin-nav-link"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "6px",
            fontWeight: 700,
            color: "#f59e0b",
            fontSize: "0.75rem",
            padding: "4px 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          ⭐ Unli Gen
        </Link>
      </nav>
      <div className="admin-nav-meta">
        <span className="admin-nav-email" title={email}>
          {email}
        </span>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}
