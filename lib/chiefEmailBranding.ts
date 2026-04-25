/**
 * Ryzen Qi (CAI | Head of Operations) — memo line + signature for Chief email bodies.
 * Logo: `public/email/xalura-xt-logo.png` (served as `/email/xalura-xt-logo.png`).
 * HTML avoids gray card backgrounds; uses `color-scheme` + inherited colors for light/dark in the client.
 */

/** Hard cap for Chief email body (inbound, digest, publish note) so replies stay brief. */
export const CHIEF_EMAIL_MAX_WORDS = 30;

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainToHtmlParagraphs(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return t
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;line-height:1.55;color:inherit;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

export function wrapChiefEmailHtml(params: {
  bodyPlain: string;
  includeMemo?: boolean;
}): string {
  const memoHtml =
    params.includeMemo === false
      ? ""
      : `<div style="font-size:12px;padding-bottom:12px;margin-bottom:12px;line-height:1.5;color:inherit;opacity:0.9;">${chiefEmailMemoBlockSync()
          .trim()
          .split("\n")
          .map((l) => escapeHtml(l))
          .join("<br/>")}</div>`;
  const bodyHtml = plainToHtmlParagraphs(params.bodyPlain);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:16px;background:transparent;color:inherit;">
<div style="max-width:560px;margin:0;">
${memoHtml}
${bodyHtml}
${chiefEmailSignatureHtmlSync()}
</div></body></html>`;
}

/** Appends memo (optional) + signature to plain text body. */
export function finishChiefPlainBody(mainBody: string, includeMemo = true): string {
  const m = mainBody.replace(/\r\n/g, "\n").trim();
  const memo = includeMemo ? `${chiefEmailMemoBlockSync()}\n` : "";
  return `${memo}${m}\n\n${chiefEmailSignaturePlainSync()}`;
}
