/** Vercel KV / Upstash — agent ingest & dashboard (no Supabase on the hot path). */
export function isAgentKvConfigured(): boolean {
  return !!(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim()
  );
}
