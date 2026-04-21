/**
 * Extract shared ingest token from common client patterns.
 * - Authorization: Bearer <token> (Bearer is case-insensitive; handles extra spaces)
 * - X-Xalura-Ingest-Token: <token> (if proxies strip Authorization)
 * - X-Ingest-Token: <token>
 */
export function extractIngestBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.length) {
    const m = /^Bearer\s+([\s\S]+)$/i.exec(auth.trim());
    if (m?.[1]) {
      return m[1].trim();
    }
  }
  const alt =
    request.headers.get("x-xalura-ingest-token") ??
    request.headers.get("x-ingest-token");
  return alt?.trim() || null;
}

export function getSharedIngestSecret(): string {
  return (
    process.env.AGENT_INGEST_SECRET?.trim() ||
    process.env.XALURA_INGEST_TOKEN?.trim() ||
    process.env.XALURA_AGENT_BEARER?.trim() ||
    ""
  );
}

/**
 * When true, POST /api/agent-update accepts requests with no Bearer token and inserts
 * pending rows with loose defaults. **Public internet can spam your DB** — use only if you
 * understand the risk; prefer AGENT_INGEST_SECRET in production.
 */
export function isAgentUpdateOpenIngest(): boolean {
  return process.env.AGENT_UPDATE_OPEN_INGEST === "true";
}

/** Server-only hint for admins: never exposes full secret. */
export type IngestSecretFingerprint = {
  configured: boolean;
  length: number | null;
  suffix: string | null;
  /** True if secret is short — recommend 32+ random chars. */
  weak: boolean;
};

export function getIngestSecretFingerprint(): IngestSecretFingerprint {
  const s = getSharedIngestSecret();
  if (!s) {
    return { configured: false, length: null, suffix: null, weak: false };
  }
  return {
    configured: true,
    length: s.length,
    suffix: s.slice(-4),
    weak: s.length < 24,
  };
}
