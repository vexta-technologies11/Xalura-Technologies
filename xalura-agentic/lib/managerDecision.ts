/**
 * Manager must return **APPROVED** or **REJECTED** on the first line (PDF workflow).
 * Lenient fallback: if neither is found, treat as approved (stub / noisy models).
 */
export function parseManagerDecision(text: string): {
  approved: boolean;
  reason: string;
} {
  const trimmed = text.trim();
  const lines = trimmed.split(/\r?\n/);
  const first = (lines[0] ?? "").trim();
  const rest = lines.slice(1).join("\n").trim();

  const u = first.toUpperCase();
  if (u.startsWith("REJECTED")) {
    return {
      approved: false,
      reason: rest || first.replace(/^REJECTED\s*/i, "").trim() || "Rejected",
    };
  }
  if (u.startsWith("APPROVED")) {
    return {
      approved: true,
      reason: rest || first.replace(/^APPROVED\s*/i, "").trim() || "Approved",
    };
  }

  return {
    approved: true,
    reason:
      "No APPROVED/REJECTED first line — lenient default (stub or unclear model output).",
  };
}
