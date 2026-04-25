/**
 * News Auditor (Chief of Audit) — first line must be **VERIFIED** or **UNVERIFIED** (or FAKE).
 */
export function parseAuditorDecision(
  text: string,
  options?: { strict?: boolean },
): { verified: boolean; reason: string } {
  const trimmed = text.trim();
  const first = (trimmed.split(/\r?\n/)[0] ?? "").trim().toUpperCase();
  const rest = trimmed.split(/\r?\n/).slice(1).join("\n").trim();

  if (first.startsWith("VERIFIED")) {
    return { verified: true, reason: rest || "Verified" };
  }
  if (first.startsWith("UNVERIFIED") || first.startsWith("FAKE") || first.startsWith("MISLEADING")) {
    return { verified: false, reason: rest || first };
  }
  if (options?.strict) {
    return {
      verified: false,
      reason: "First line must be VERIFIED or UNVERIFIED / FAKE.",
    };
  }
  return { verified: false, reason: rest || "unclear" };
}
