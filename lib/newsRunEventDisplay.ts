import type { NewsRunEventRow } from "@/lib/newsRunEvents";

function detailLines(
  d: Record<string, unknown> | null | undefined,
): string[] {
  if (!d || typeof d !== "object") return [];
  const out: string[] = [];
  const reason = d["reason"];
  if (typeof reason === "string" && reason.trim()) {
    out.push(
      `**Note / reason:** ${reason.replace(/\s+/g, " ").trim().slice(0, 900)}`,
    );
  }
  const head = d["head"];
  if (typeof head === "string" && head.trim()) {
    out.push(
      `**Worker output (excerpt):** ${head.replace(/\s+/g, " ").trim().slice(0, 550)}`,
    );
  }
  const sample = d["sample"];
  if (typeof sample === "string" && sample.trim()) {
    out.push(
      `**Exec / audit excerpt:** ${sample.replace(/\s+/g, " ").trim().slice(0, 800)}`,
    );
  }
  return out;
}

/**
 * One `news_run_events` row for Chief / News team email snapshots: includes
 * `detail.reason` / `head` / `sample` (not just `APPROVED` in summary).
 */
export function formatNewsRunEventForEmailSnapshot(
  r: NewsRunEventRow,
): string {
  const ts = (r.created_at ?? "").replace("T", " ").slice(0, 19) || "?";
  const sm = (r.summary ?? "").replace(/\s+/g, " ").trim() || "—";
  const base = `[${ts}] **${(r.stage ?? "?").replace(/\s+/g, " ").trim()}** — ${sm}  \`run: ${(r.run_id ?? "").replace(/`/g, "")}\``;
  const d = (r.detail ?? null) as Record<string, unknown> | null;
  const extra = detailLines(d);
  if (extra.length === 0) return base;
  return [base, ...extra.map((x) => `  ${x}`)].join("\n");
}
