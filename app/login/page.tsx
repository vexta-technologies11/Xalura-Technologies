"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function envMissing() {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL !== "string" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "string" ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (envMissing()) {
      setError(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local and restart the dev server.",
      );
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message || "Sign-in failed");
        return;
      }
      if (!data.session) {
        setError("No session returned. If email confirmation is required, confirm your email in Supabase or disable it under Authentication → Providers → Email.");
        return;
      }
      /* Full navigation so middleware sees auth cookies (client router alone can race). */
      window.location.assign("/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 28,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Admin
        </h1>
        <p style={{ fontSize: 14, color: "#52524f", marginBottom: 28 }}>
          Sign in to manage Xalura content.
        </p>
        <label
          style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8 }}
        >
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.12)",
            marginBottom: 16,
            fontSize: 14,
          }}
        />
        <label
          style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8 }}
        >
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.12)",
            marginBottom: 20,
            fontSize: 14,
          }}
        />
        {error ? (
          <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-dark"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
