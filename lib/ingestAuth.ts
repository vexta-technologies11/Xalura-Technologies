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
