/**
 * Manager must return **APPROVED** or **REJECTED** on the first line (PDF workflow).
 * Lenient fallback: if neither is found, treat as approved (stub / noisy models).
 * **strict:** unclear first line counts as **REJECTED** (required for Publishing gate).
 */
export function parseManagerDecision(
  text: string,
  options?: { strict?: boolean },
): {
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

  if (options?.strict) {
    return {
      approved: false,
      reason:
        "REJECTED — First line must be exactly APPROVED or REJECTED (unclear or missing decision).",
    };
  }

  return {
    approved: true,
    reason:
      "No APPROVED/REJECTED first line — lenient default (stub or unclear model output).",
  };
}
