"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/employees", label: "AI Employees" },
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
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e5e5",
        padding: "16px 24px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{ fontSize: 14, color: "#0a0a0a", textDecoration: "none" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 12, color: "#737373" }}>{email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            fontSize: 13,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #0a0a0a",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
