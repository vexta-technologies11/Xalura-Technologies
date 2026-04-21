"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/ai-dashboard", label: "AI Dashboard" },
  { href: "/admin/employees", label: "AI Employees" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/content", label: "Page Content" },
  { href: "/admin/partners", label: "Partners" },
];

export function AdminNav({ email }: { email: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
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
