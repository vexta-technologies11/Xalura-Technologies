/**
 * Read `Response` as JSON without throwing if the body is HTML (error pages, login redirects, 404).
 * Use for client `fetch` to avoid `Unexpected token '<'`.
 */
export async function readResponseJson<T>(res: Response): Promise<
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; notJson?: true }
> {
  const text = await res.text();
  const t = text.trim();
  if (!t) {
    return { ok: false, error: "Empty response from server", status: res.status, notJson: true };
  }
  if (t.startsWith("<!") || /^<html[\s>]/i.test(t)) {
    return {
      ok: false,
      error: `Server returned a web page instead of JSON (HTTP ${res.status}). The API may be missing, the app may have crashed, or your session expired — try refreshing or signing in to Admin again.`,
      status: res.status,
      notJson: true,
    };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T, status: res.status };
  } catch {
    return {
      ok: false,
      error: `Invalid JSON (HTTP ${res.status}): ${t.slice(0, 180)}${t.length > 180 ? "…" : ""}`,
      status: res.status,
      notJson: true,
    };
  }
}
