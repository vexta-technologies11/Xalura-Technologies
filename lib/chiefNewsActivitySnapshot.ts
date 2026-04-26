import { formatNewsRunEventForEmailSnapshot } from "@/lib/newsRunEventDisplay";
import { fetchNewsRunEventsForAdminFeed } from "@/lib/newsRunEvents";

/**
 * Heuristic: user is asking about the News pipeline (pre-prod, publish, audit, etc.).
 */
export function wantsNewsDepartmentContext(subject: string, body: string): boolean {
  const t = `${subject}\n${body}`.toLowerCase();
  if (/\bnews\s+(desk|department|team|pipeline)\b/.test(t)) return true;
  if (/\bxalura news\b|\bhead of news\b/.test(t)) return true;
  if (/\bpre-?prod|preprod|writer (?:desk|manager|round)\b/.test(t)) return true;
  if (/\bchief of audit|news audit|published (?:article|story|on the site)\b/.test(t)) return true;
  if (/\bnews (?:run|pipeline|publish|status|update)\b/.test(t)) return true;
  return /\bnews\b/.test(t);
}

/**
 * Recent `news_run_events` rows for Chief inbound context (pre-prod → head digest → publish).
 */
export async function buildNewsDepartmentActivitySnapshotForChief(
  limit: number = 60,
): Promise<string> {
  const rows = await fetchNewsRunEventsForAdminFeed(Math.min(100, Math.max(1, limit)));
  if (!rows.length) {
    return "(No rows in `news_run_events` yet, or Supabase service client unavailable.)";
  }
  const lines = rows.map((r) => formatNewsRunEventForEmailSnapshot(r));
  return `Recent News pipeline activity (newest first, each row includes detail when stored: reasons, worker/audit excerpts):\n\n${lines.join("\n\n")}`.slice(
    0,
    14_000,
  );
}
