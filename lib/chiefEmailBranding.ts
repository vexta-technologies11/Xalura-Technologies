/**
 * Chief AI (Ryzen Qi) — consistent memo line + signature for inbound and digest emails.
 * Logo: `public/email/xalura-xt-logo.png` (served as `/email/xalura-xt-logo.png`).
 */

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

/** Minimal HTML for clients that render HTML; includes logo. */
export function chiefEmailSignatureHtmlSync(): string {
  const src = chiefEmailLogoUrlSync();
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px;max-width:420px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#0f172a;">
<tr><td style="padding:0 16px 12px 0;vertical-align:top;"><img src="${src}" width="120" height="auto" alt="Xalura Tech" style="display:block;border:0;max-width:120px;height:auto;" /></td>
<td style="vertical-align:top;padding-top:4px;">
<div style="font-weight:600;">Ryzen Qi</div>
<div style="color:#64748b;font-size:13px;">CAI | Head of Operations</div>
<div style="margin-top:8px;font-size:13px;">Phone: <a href="tel:+17154911674" style="color:#2563eb;">(715) 491-1674</a></div>
<div style="font-size:13px;">Email: <a href="mailto:RyzenQi@xaluratech.com" style="color:#2563eb;">RyzenQi@xaluratech.com</a></div>
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
    .map((p) => `<p style="margin:0 0 12px 0;line-height:1.55;color:#0f172a;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function wrapChiefEmailHtml(params: {
  bodyPlain: string;
  includeMemo?: boolean;
}): string {
  const memoHtml =
    params.includeMemo === false
      ? ""
      : `<div style="font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;line-height:1.5;">${chiefEmailMemoBlockSync()
          .trim()
          .split("\n")
          .map((l) => escapeHtml(l))
          .join("<br/>")}</div>`;
  const bodyHtml = plainToHtmlParagraphs(params.bodyPlain);
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:24px 28px;border-radius:8px;border:1px solid #e2e8f0;">
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
