/**
 * Ryzen Qi (CAI | Head of Operations) — memo line + signature for Chief email bodies.
 * Logo: `public/email/xalura-xt-logo.png` (served as `/email/xalura-xt-logo.png`).
 * HTML avoids gray card backgrounds; uses `color-scheme` + inherited colors for light/dark in the client.
 */

/** Hard cap for Chief email body (inbound, digest, publish note) so replies stay brief. */
export const CHIEF_EMAIL_MAX_WORDS = 100;

const OPENING_SALUTATIONS = [
  "Good morning, Boss.",
  "Good afternoon, Boss.",
  "Good evening, Boss.",
  "Boss — a quick update.",
] as const;

const REPLY_SALUTATIONS = [
  "Hello, Boss —",
  "Greetings, Boss —",
  "Hi, Boss —",
  "Good to hear from you, Boss —",
] as const;

/** One random opener for a new thread (no prior messages in our log). */
export function pickChiefEmailOpeningSalutation(): string {
  return OPENING_SALUTATIONS[Math.floor(Math.random() * OPENING_SALUTATIONS.length)] ?? OPENING_SALUTATIONS[0]!;
}

/** One random line for a reply in an existing thread. */
export function pickChiefEmailReplySalutation(): string {
  return REPLY_SALUTATIONS[Math.floor(Math.random() * REPLY_SALUTATIONS.length)] ?? REPLY_SALUTATIONS[0]!;
}

export function pickChiefEmailSalutation(variant: "opening" | "reply"): string {
  return variant === "opening" ? pickChiefEmailOpeningSalutation() : pickChiefEmailReplySalutation();
}

export function clipChiefEmailWords(s: string, maxWords: number = CHIEF_EMAIL_MAX_WORDS): string {
  const words = s.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function publicSiteBaseUrl(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") ||
    process.env["AGENTIC_PUBLIC_BASE_URL"]?.replace(/\/$/, "") ||
    "https://www.xaluratech.com"
  );
}

/** Memo block: To / From / Cc — shown at top of body (display-only; Resend still uses API `to`). */
export function chiefEmailMemoBlockSync(overrides?: {
  to?: string;
  from?: string;
  ccLine?: string;
}): string {
  const to =
    overrides?.to?.trim() ||
    process.env["CHIEF_EMAIL_MEMO_TO"]?.trim() ||
    "JhonCadullo@xaluratech.com";
  const from =
    overrides?.from?.trim() ||
    process.env["CHIEF_EMAIL_MEMO_FROM"]?.trim() ||
    "RyzenQi@xaluratech.com";
  const cc =
    overrides?.ccLine?.trim() ||
    process.env["CHIEF_EMAIL_MEMO_CC_LINE"]?.trim() ||
    "Department VPs, Head of Compliance, Department Managers";
  return `To: ${to}\nFrom: ${from}\nCc: ${cc}\n`;
}

export function chiefEmailSignaturePlainSync(): string {
  return [
    "—",
    "Ryzen Qi, CAI | Head of Operations",
    "Phone: (715) 491-1674",
    "Email: RyzenQi@xaluratech.com",
  ].join("\n");
}

/** News publish digest: Chief of Audit closing block (same visual pattern as Chief; used instead of Ryzen for that send). */
export function richardMaybachSignaturePlainSync(): string {
  return [
    "—",
    "Richard Maybach, Chief of Audit",
    "Phone: (715) 491-0295",
    "Email: richardmaybach@xaluratech.com",
  ].join("\n");
}

export function chiefEmailLogoUrlSync(): string {
  return `${publicSiteBaseUrl()}/email/xalura-xt-logo.png`;
}

/** Minimal HTML for clients that render HTML; includes logo. No fixed page/card backgrounds so light/dark can follow the client. */
export function chiefEmailSignatureHtmlSync(): string {
  const src = chiefEmailLogoUrlSync();
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:8px;max-width:420px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:inherit;">
<tr><td style="padding:0 16px 12px 0;vertical-align:top;"><img src="${src}" width="120" height="auto" alt="Xalura Tech" style="display:block;border:0;max-width:120px;height:auto;" /></td>
<td style="vertical-align:top;padding-top:4px;">
<div style="font-weight:600;">Ryzen Qi</div>
<div style="font-size:13px;opacity:0.9;">CAI | Head of Operations</div>
<div style="margin-top:8px;font-size:13px;">Phone: <a href="tel:+17154911674" style="color:inherit;">(715) 491-1674</a></div>
<div style="font-size:13px;">Email: <a href="mailto:RyzenQi@xaluratech.com" style="color:inherit;">RyzenQi@xaluratech.com</a></div>
</td></tr></table>`;
}

/** HTML footer for News digest (Chief of Audit) — same table layout as Chief. */
export function richardMaybachSignatureHtmlSync(): string {
  const src = chiefEmailLogoUrlSync();
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:8px;max-width:420px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:inherit;">
<tr><td style="padding:0 16px 12px 0;vertical-align:top;"><img src="${src}" width="120" height="auto" alt="Xalura Tech" style="display:block;border:0;max-width:120px;height:auto;" /></td>
<td style="vertical-align:top;padding-top:4px;">
<div style="font-weight:600;">Richard Maybach</div>
<div style="font-size:13px;opacity:0.9;">Chief of Audit</div>
<div style="margin-top:8px;font-size:13px;">Phone: <a href="tel:+17154910295" style="color:inherit;">(715) 491-0295</a></div>
<div style="font-size:13px;">Email: <a href="mailto:richardmaybach@xaluratech.com" style="color:inherit;">richardmaybach@xaluratech.com</a></div>
</td></tr></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Post-publish **article** compliance memorandum — signature block (logo + Head of Compliance). */
export function complianceOfficerEmailSignatureHtmlSync(overrides?: {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
}): string {
  const name = overrides?.name?.trim() || "Martin Cruz";
  const title = overrides?.title?.trim() || "Head of Compliance";
  const phone = overrides?.phone?.trim() || "0918-348-3860";
  const email = overrides?.email?.trim() || "martincruz@xaluratech.com";
  const src = chiefEmailLogoUrlSync();
  const phoneDigits = phone.replace(/\D/g, "");
  const telHref =
    phoneDigits.length >= 8
      ? `tel:${phoneDigits.startsWith("0") && phoneDigits.length === 11 ? `+63${phoneDigits.slice(1)}` : `+${phoneDigits}`}`
      : `tel:${encodeURIComponent(phone)}`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;padding-top:12px;max-width:480px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#1a1a1a;">
<tr><td style="padding:0 16px 12px 0;vertical-align:top;"><img src="${src}" width="120" height="auto" alt="Xalura Tech" style="display:block;border:0;max-width:120px;height:auto;" /></td>
<td style="vertical-align:top;padding-top:4px;">
<div style="font-weight:600;">${escapeHtml(name)}</div>
<div style="font-size:13px;opacity:0.88;">${escapeHtml(title)}</div>
<div style="margin-top:8px;font-size:13px;">Phone: <a href="${escapeHtml(telHref)}" style="color:#0a0a0a;">${escapeHtml(phone)}</a></div>
<div style="font-size:13px;">Email: <a href="mailto:${escapeHtml(email)}" style="color:#0a0a0a;">${escapeHtml(email)}</a></div>
</td></tr></table>`;
}

export function complianceOfficerEmailSignaturePlainSync(overrides?: {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
}): string {
  const name = overrides?.name?.trim() || "Martin Cruz";
  const title = overrides?.title?.trim() || "Head of Compliance";
  const phone = overrides?.phone?.trim() || "0918-348-3860";
  const email = overrides?.email?.trim() || "martincruz@xaluratech.com";
  return ["—", `${name}, ${title}`, `Phone: ${phone}`, `Email: ${email}`].join("\n");
}

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  return (
    /^#{1,3}\s+/.test(t) ||
    /^\*\*[^*]+\*\*$/.test(t) ||
    /^[A-Z][A-Z0-9 /&(),.'-]{4,}:$/.test(t)
  );
}

function splitLongSentenceParagraph(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [text];
}

function paragraphHtml(text: string): string {
  return `<p style="margin:0 0 12px 0;line-height:1.58;color:inherit;">${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
}

function headingHtml(text: string): string {
  const t = text.replace(/^#{1,3}\s+/, "").replace(/^\*\*|\*\*$/g, "").trim();
  return `<h2 style="margin:18px 0 10px 0;line-height:1.28;color:inherit;font-size:17px;font-weight:700;">${escapeHtml(t)}</h2>`;
}

function bulletHtml(text: string): string {
  return `<p style="margin:0 0 10px 0;line-height:1.58;color:inherit;padding-left:14px;text-indent:-14px;">${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
}

export function emailPlainToRichHtml(text: string): string {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return "";
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    const joined = para.join(" ").replace(/\s+/g, " ").trim();
    para = [];
    if (!joined) return;
    const parts =
      joined.length > 280 && !joined.includes("\n")
        ? splitLongSentenceParagraph(joined)
        : [joined];
    for (const part of parts) {
      out.push(paragraphHtml(part));
    }
  };
  for (const rawLine of t.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (isHeadingLine(line)) {
      flush();
      out.push(headingHtml(line));
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      flush();
      out.push(bulletHtml(line));
      continue;
    }
    para.push(line);
  }
  flush();
  return out.join("");
}

export function plainToHtmlParagraphs(text: string): string {
  return emailPlainToRichHtml(text);
}

export function wrapChiefEmailHtml(params: {
  bodyPlain: string;
  includeMemo?: boolean;
  /** When set, use these instead of default memo; for news desk Cc line. */
  memoOverrides?: { to?: string; from?: string; ccLine?: string };
}): string {
  const memoHtml =
    params.includeMemo === false
      ? ""
      : `<div style="font-size:12px;padding-bottom:12px;margin-bottom:12px;line-height:1.5;color:inherit;opacity:0.9;">${chiefEmailMemoBlockSync(
          params.memoOverrides,
        )
          .trim()
          .split("\n")
          .map((l) => escapeHtml(l))
          .join("<br/>")}</div>`;
  const bodyHtml = emailPlainToRichHtml(params.bodyPlain);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:16px;background:transparent;color:inherit;">
<div style="max-width:560px;margin:0;">
${memoHtml}
${bodyHtml}
${chiefEmailSignatureHtmlSync()}
</div></body></html>`;
}

/** News post-publish digest: same memo pattern + Richard Maybach signature instead of Ryzen. */
export function wrapNewsAuditDigestEmailHtml(params: {
  bodyPlain: string;
  includeMemo?: boolean;
  memoOverrides?: { to?: string; from?: string; ccLine?: string };
}): string {
  const memoHtml =
    params.includeMemo === false
      ? ""
      : `<div style="font-size:12px;padding-bottom:12px;margin-bottom:12px;line-height:1.5;color:inherit;opacity:0.9;">${chiefEmailMemoBlockSync(
          params.memoOverrides,
        )
          .trim()
          .split("\n")
          .map((l) => escapeHtml(l))
          .join("<br/>")}</div>`;
  const bodyHtml = emailPlainToRichHtml(params.bodyPlain);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:16px;background:transparent;color:inherit;">
<div style="max-width:560px;margin:0;">
${memoHtml}
${bodyHtml}
${richardMaybachSignatureHtmlSync()}
</div></body></html>`;
}

/** Appends memo (optional) + signature to plain text body. */
export function finishChiefPlainBody(
  mainBody: string,
  includeMemo = true,
  memoOverrides?: { to?: string; from?: string; ccLine?: string },
): string {
  const m = mainBody.replace(/\r\n/g, "\n").trim();
  const memo = includeMemo ? `${chiefEmailMemoBlockSync(memoOverrides)}\n` : "";
  return `${memo}${m}\n\n${chiefEmailSignaturePlainSync()}`;
}

export function finishNewsAuditDigestPlainBody(
  mainBody: string,
  includeMemo = true,
  memoOverrides?: { to?: string; from?: string; ccLine?: string },
): string {
  const m = mainBody.replace(/\r\n/g, "\n").trim();
  const memo = includeMemo ? `${chiefEmailMemoBlockSync(memoOverrides)}\n` : "";
  return `${memo}${m}\n\n${richardMaybachSignaturePlainSync()}`;
}
