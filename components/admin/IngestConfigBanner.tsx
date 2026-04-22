import type { IngestSecretFingerprint } from "@/lib/ingestAuth";

/**
 * Shows whether the shared ingest password is set on this deployment (server-side env).
 * Shows length + last 4 chars so you can match GearMedic without exposing the full password.
 */
export function IngestConfigBanner({
  fp,
  kvConfigured = false,
}: {
  fp: IngestSecretFingerprint;
  /** Agent ingest uses Vercel KV — not Supabase. */
  kvConfigured?: boolean;
}) {
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
        <strong>One shared password</strong> for GearMedic: set env <code>INGEST_PASSWORD</code>{" "}
        (or <code>AGENT_INGEST_SECRET</code>) in your hosting dashboard — same characters you paste
        into GearMedic as <code>Authorization: Bearer …</code>. Agent POSTs use KV storage; Supabase
        is only for admin login and the public team list.
      </p>
      {kvConfigured ? (
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#15803d" }}>
          KV storage is configured for this deployment.
        </p>
      ) : (
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#b91c1c" }}>
          <strong>KV not configured.</strong> Add Redis/KV from Vercel Marketplace and set{" "}
          <code>KV_REST_API_URL</code> + <code>KV_REST_API_TOKEN</code>, then redeploy.
        </p>
      )}
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
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
              Short password is fine for a small or test site. Use a longer one if strangers can hit
              your API.
            </p>
          ) : null}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "0.9375rem", color: "#b91c1c" }}>
          <strong>No shared password on this deployment.</strong> Add{" "}
          <code>INGEST_PASSWORD=yourpassword</code> (or <code>AGENT_INGEST_SECRET</code>) in your
          host env and redeploy. Until then, only optional per-agent <code>xal_…</code> keys work.
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
