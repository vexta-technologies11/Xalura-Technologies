import { createHash, randomBytes } from "node:crypto";

/**
 * Normalized RFC 5322 Message-ID form: one angle-bracket token.
 * Empty input returns "" (caller may substitute a synthetic id).
 */
export function normalizeRfcMessageId(mid: string | null | undefined): string {
  const t = (mid ?? "").trim();
  if (!t) return "";
  if (t.startsWith("<") && t.endsWith(">")) return t;
  return `<${t}>`;
}

/**
 * Inbound with no `message_id` from Resend — stable synthetic id (still unique, debuggable).
 */
export function syntheticInboundRfcMessageId(resendEmailId: string): string {
  return `<inbound.resend.${resendEmailId}@chief.thread.xalura>`;
}

const SYNTHETIC_RE = /^<inbound\.resend\.([^>]+)@chief\.thread\.xalura>$/;

/**
 * Derive Resend `email_id` if this id was our synthetic (else null).
 */
export function parseSyntheticInboundResendId(rfc: string | undefined | null): string | null {
  if (!rfc) return null;
  const m = SYNTHETIC_RE.exec(rfc.trim());
  return m?.[1] ?? null;
}

export function rfcForLookup(raw: string): string {
  return normalizeRfcMessageId(raw).toLowerCase();
}

/** Deterministic 24-hex "domain" for Message-ID from FROM address. */
function domainTokenFromFrom(from: string | undefined | null): string {
  const f = (from ?? "").trim() || "chief";
  return createHash("sha256")
    .update(f.toLowerCase(), "utf8")
    .digest("hex")
    .slice(0, 12);
}

export function newOutboundRfcMessageId(fromAddr: string | undefined | null): string {
  return `<${cryptoRandomHex(16)}.${domainTokenFromFrom(fromAddr)}@chief.outbound.xalura>`;
}

function cryptoRandomHex(nBytes: number): string {
  return randomBytes(nBytes).toString("hex");
}

/**
 * `References` header: space-separated angle-bracket ids (RFC 5322).
 */
export function joinReferencesRfc(ids: string[]): string {
  const out: string[] = [];
  for (const id of ids) {
    const n = normalizeRfcMessageId(id);
    if (n && !out.includes(n)) out.push(n);
  }
  return out.join(" ");
}
