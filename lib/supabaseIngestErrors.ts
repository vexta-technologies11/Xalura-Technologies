/**
 * PostgREST often returns message "Invalid API key" when SUPABASE_SERVICE_ROLE_KEY
 * is wrong, revoked, or for a different project than NEXT_PUBLIC_SUPABASE_URL.
 * That is unrelated to the client's Authorization Bearer (ingest secret).
 */
export function responseBodyForSupabaseWriteError(insErr: {
  message?: string;
} | null): { status: number; body: Record<string, string> } {
  const msg = insErr?.message ?? "Insert failed";

  const looksLikeServerKey =
    /invalid api key/i.test(msg) || /jwt (expired|invalid)/i.test(msg);

  if (looksLikeServerKey) {
    return {
      status: 500,
      body: {
        error:
          "Supabase rejected this server's API key — not your ingest Bearer token.",
        detail:
          "In Vercel, set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase → Project Settings → API for the same project as NEXT_PUBLIC_SUPABASE_URL. Redeploy. Compare: a wrong or truncated key produces this exact message on insert.",
        supabase_message: msg,
      },
    };
  }

  return { status: 500, body: { error: msg } };
}
