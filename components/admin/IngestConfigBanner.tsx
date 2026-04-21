import type { IngestSecretFingerprint } from "@/lib/ingestAuth";

/**
 * Shows whether shared ingest is configured on **this deployment** (reads Vercel env server-side).
 * Lets you verify the same secret as GearMedic/.env without exposing the full token.
 */
export function IngestConfigBanner({ fp }: { fp: IngestSecretFingerprint }) {
  return (
    <div
      className="admin-card admin-card-pad"
      style={{
        marginBottom: 22,
        borderColor: "#bfdbfe",
        background: "linear-gradient(180deg, #eff6ff 0%, #fff 100%)",
      }}
    >
      <p className="admin-badge" style={{ marginBottom: 10 }}>
        Shared ingest (GearMedic / automations)
      </p>
      <p style={{ margin: "0 0 12px", fontSize: "0.9375rem", lineHeight: 1.6, color: "#0f172a" }}>
        <strong>AGENT_INGEST_SECRET</strong> lives only in{" "}
        <strong>Vercel → Environment Variables</strong> — it is{" "}
        <strong>not</strong> shown anywhere in Supabase and{" "}
        <strong>not</strong> the same as the per-agent <code>xal_…</code> keys below.
        You create the secret once and paste the identical value into Vercel and GearMedic.
      </p>
      {fp.configured ? (
        <>
          <p style={{ margin: "0 0 8px", fontSize: "0.9375rem", color: "#0f172a" }}>
            <strong>Verification</strong> (compare with GearMedic / your <code>.env.local</code> — must
            match <em>exactly</em>, including length):
          </p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 22, color: "#334155", lineHeight: 1.6 }}>
            <li>
              Character length: <strong>{fp.length}</strong>
            </li>
            <li>
              Last 4 characters: <strong>…{fp.suffix}</strong>
            </li>
          </ul>
          {fp.weak ? (
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#b45309" }}>
              This secret is short. Prefer <code>openssl rand -hex 32</code> (64 hex chars) to avoid
              typos and brute force.
            </p>
          ) : null}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "0.9375rem", color: "#b91c1c" }}>
          <strong>Not configured on this deployment.</strong> Set{" "}
          <code>AGENT_INGEST_SECRET</code> in Vercel and redeploy. Until then, only per-agent{" "}
          <code>xal_…</code> keys work (with matching employee UUID in <code>agent_id</code>).
        </p>
      )}
      <p
        style={{
          margin: "14px 0 0",
          fontSize: "0.8125rem",
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        Diagnostics:{" "}
        <a href="/api/ingest-health" target="_blank" rel="noreferrer">
          GET /api/ingest-health
        </a>
      </p>
    </div>
  );
}
