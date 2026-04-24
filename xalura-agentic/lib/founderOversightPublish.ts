import path from "path";
import { readFileUtf8Agentic } from "./agenticDisk";
import type { ChiefPublishDigestParams } from "./chiefPublishDigest";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import { appendFailedOperation, readFailedQueue } from "./failedQueue";
import { generateImagenImage } from "./imagenGenerate";
import { readEvents } from "./eventQueue";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";
import { resolveGeminiApiKey, runAgent } from "./gemini";
import { getAgenticRoot } from "./paths";

export type FounderOversightPublishParams = ChiefPublishDigestParams & {
  /** Last Publishing Manager output (who approved and why). */
  managerOutput: string;
  contentVerticalId?: string;
  contentVerticalLabel?: string;
  /** When set, skip a second Imagen pass (reuse hero from site publish). */
  precomputedHero?: {
    filename: string;
    content: string;
    imagePrompt: string;
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text bundle sent into advisory Gemini calls (and smoke tests). */
export function buildFounderOversightBriefing(p: FounderOversightPublishParams): string {
  const recentFails = readFailedQueue(p.cwd).slice(-12);
  const failBlock =
    recentFails.length === 0
      ? "(No failed-queue rows in window.)"
      : recentFails
          .map(
            (f) =>
              `- [${f.ts}] ${f.kind}: ${f.message}${f.detail ? ` | ${f.detail.replace(/\s+/g, " ").slice(0, 200)}` : ""}`,
          )
          .join("\n");

  const events = readEvents(p.cwd).slice(-40);
  const evBlock = events
    .map((e) => `${e.ts}  ${e.type}  ${JSON.stringify(e).slice(0, 220)}`)
    .join("\n");

  let cycleExcerpt = "(cycle file not read)";
  try {
    const abs = path.join(getAgenticRoot(p.cwd), p.cycleFileRelative);
    const raw = readFileUtf8Agentic(abs.replace(/\\/g, "/"));
    if (raw != null) cycleExcerpt = raw.slice(0, 12_000);
  } catch {
    cycleExcerpt = "(cycle file read error)";
  }

  return [
    `TITLE: ${p.title}`,
    `SLUG: ${p.slug}  PATH: ${p.articlePath}`,
    p.contentVerticalId
      ? `VERTICAL: ${p.contentVerticalLabel ?? ""} (${p.contentVerticalId})`
      : "",
    "",
    "=== Publishing Manager (approval authority) ===",
    p.managerOutput.slice(0, 8000),
    "",
    "=== Executive summary ===",
    p.executiveSummary.slice(0, 6000),
    "",
    "=== Worker output (article excerpt) ===",
    p.workerOutputExcerpt.slice(0, 8000),
    "",
    `=== Cycle file (${p.cycleFileRelative}) excerpt ===`,
    cycleExcerpt,
    "",
    "=== Recent event queue (newest at bottom) ===",
    evBlock.slice(0, 14_000),
    "",
    "=== Failed operations (tail) ===",
    failBlock,
    "",
    `Zernio: ${p.zernioLine}`,
    `cycleIndex=${p.cycleIndex} auditTriggered=${p.auditTriggered}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Compliance / founder email after each successful site publish — **advisory only** (no veto).
 * Env: **`AGENTIC_COMPLIANCE_ON_PUBLISH`** or **`AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH`** (`true`/`1`);
 * inbox: **`AGENTIC_COMPLIANCE_EMAIL`** → **`AGENTIC_FOUNDER_OVERSIGHT_EMAIL`** → **`AGENTIC_CHIEF_DIGEST_EMAIL`**.
 * Uses **Gemini 2.5 flash lite** (default `GEMINI_MODEL`) for QA, Risk, Chief-line audit, then **Compliance Officer** memo + draft “Cc: Chief AI, Executives” (display only in body — not Resend `cc`).
 * Optional **Graphic designer** uses **Imagen** (`AGENTIC_IMAGE_MODEL`, default Ultra) + same API key.
 */
export function scheduleFounderOversightPublishEmail(
  params: FounderOversightPublishParams,
): void {
  waitUntilAfterResponse(executeFounderOversightPublishEmail(params));
}

/** Full compliance email work (Gemini + optional Resend). */
export async function executeFounderOversightPublishEmail(
  p: FounderOversightPublishParams,
): Promise<void> {
  const complianceFlag = (await resolveWorkerEnv("AGENTIC_COMPLIANCE_ON_PUBLISH"))
    ?.trim()
    .toLowerCase();
  const founderFlag = (await resolveWorkerEnv("AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH"))
    ?.trim()
    .toLowerCase();
  const on =
    complianceFlag === "true" ||
    complianceFlag === "1" ||
    founderFlag === "true" ||
    founderFlag === "1";
  if (!on) return;

  const to =
    (await resolveWorkerEnv("AGENTIC_COMPLIANCE_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_FOUNDER_OVERSIGHT_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim();
  if (!to) return;

  const briefing = buildFounderOversightBriefing(p);

  const qaTask = `You are the **Quality Assurance (advisory)** analyst for Xalura Tech. The Founder receives this note — you do **not** veto anything.

Read the briefing. Output markdown with:
## QA summary (3–6 bullets)
## Confidence (one line: High / Medium / Low)

Stay factual; do not invent URLs or metrics not in the briefing.

BRIEFING:
---
${briefing.slice(0, 28_000)}
---`;

  const riskTask = `You are the **Risk & reputation (advisory)** analyst. Report to the Founder only. **No veto power.**

Read the briefing. Output markdown that **starts** with a single line exactly:
RISK_LEVEL: LOW
or
RISK_LEVEL: MEDIUM
or
RISK_LEVEL: HIGH

Then sections:
## Why this level
## Key risk factors (3–8 bullets — concrete, from the briefing only)
## Who / what to watch (roles: Publishing Worker, Manager, Executive — infer from briefing)

BRIEFING:
---
${briefing.slice(0, 28_000)}
---`;

  const chiefAuditTask = `You are an **independent oversight** analyst auditing whether the **discipline** of this publish matches what a Chief AI would expect (process quality, not personal attacks). You report to the **Founder** alongside Chief AI — **advisory only**, no veto.

Read the briefing. Output markdown:
## Alignment with Chief-level expectations
## Gaps or inconsistencies (if any)
## Note on Chief AI: you are **not** replacing Chief — you comment on whether this run deserved publication given the evidence.

BRIEFING:
---
${briefing.slice(0, 28_000)}
---`;

  let qaMd = "";
  let riskMd = "";
  let chiefAuditMd = "";
  let complianceMd = "";
  let graphicSection = "";
  const attachments: { filename: string; content: string }[] = [];

  try {
    qaMd = await runAgent({
      role: "Worker",
      department: "Quality Assurance (advisory)",
      task: qaTask,
      context: { kind: "founder_qa", slug: p.slug },
    });
  } catch (e) {
    qaMd = `_(QA call failed: ${esc(String(e))})_`;
  }

  try {
    riskMd = await runAgent({
      role: "Worker",
      department: "Risk & reputation (advisory)",
      task: riskTask,
      context: { kind: "founder_risk", slug: p.slug },
    });
  } catch (e) {
    riskMd = `_(Risk call failed: ${esc(String(e))})_`;
  }

  try {
    chiefAuditMd = await runAgent({
      role: "Worker",
      department: "Chief process audit (advisory)",
      task: chiefAuditTask,
      context: { kind: "founder_chief_audit", slug: p.slug },
    });
  } catch (e) {
    chiefAuditMd = `_(Chief-line audit failed: ${esc(String(e))})_`;
  }

  const complianceTask = `You are the **Compliance Officer** for Xalura Tech (advisory only — **no veto**; the article is already live). You report to the **Founder** in one consolidated memo.

Internal analysts already produced notes below (QA, Risk, Chief-line process). **Honor the Risk analyst’s first-line \`RISK_LEVEL:\`** — do not contradict it. Synthesize; do not invent facts absent from the briefing or notes.

Output **markdown** with this structure:

## Risk snapshot
- **Rating:** one line — copy the Risk analyst’s \`RISK_LEVEL: …\` line verbatim if present, else state unknown.

## Top risk factors
- 3–8 bullets (tight, from evidence in the notes/briefing only).

## Compliance officer view
- 3–6 sentences: your read on posture, residual concerns, what to watch on the next publish.

## Draft email (memo — Cc lines are **for display only**; they are not separate recipients)
Write a polished **email-shaped block** the Founder could paste or forward. Use exactly this header format (fill Subject and body):

To: Founder
Cc: Chief AI (informational — advisory roll-up only), Executives (informational — advisory roll-up only)
Subject: [Compliance] Published article — ${p.title.slice(0, 120)}

Then the email body (plain paragraphs, no markdown headings inside the body): acknowledge publish, one-line link path \`${p.articlePath}\`, summarize risk rating and 2–3 factors, note that **Publishing Manager** approved per ladder, and that Chief AI / Executives are Cc’d **for context only** (no automatic mail to them).

---
INTERNAL — QA analyst:
${qaMd.slice(0, 4500)}

---
INTERNAL — Risk analyst:
${riskMd.slice(0, 4500)}

---
INTERNAL — Chief-line audit:
${chiefAuditMd.slice(0, 4500)}
---`;

  try {
    complianceMd = await runAgent({
      role: "Worker",
      department: "Compliance Officer (advisory)",
      task: complianceTask,
      context: { kind: "compliance_officer_memo", slug: p.slug },
    });
  } catch (e) {
    complianceMd = `_(Compliance memo failed: ${esc(String(e))})_`;
  }

  const gdFlag = (await resolveWorkerEnv("AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH"))
    ?.trim()
    .toLowerCase();
  const gdOn = gdFlag === "true" || gdFlag === "1";
  if (p.precomputedHero) {
    attachments.push({
      filename: p.precomputedHero.filename,
      content: p.precomputedHero.content,
    });
    graphicSection = `<h2>Graphic designer (Imagen 4 Ultra)</h2><p>Prompt used (flash-lite draft):</p><pre>${esc(p.precomputedHero.imagePrompt)}</pre><p>Image attached: <code>${esc(p.precomputedHero.filename)}</code> (same asset as article cover when upload succeeded).</p>`;
  } else if (gdOn) {
    try {
      const promptBrief = await runAgent({
        role: "Worker",
        department: "Publishing — Graphic Designer",
        task: `You are the **Graphic Designer**. Produce **only** a single compact English image generation prompt (max 500 characters) for one hero illustration for this published article. No quotes, no markdown — raw prompt text only.

Article title: ${p.title}
Executive summary:
${p.executiveSummary.slice(0, 2000)}`,
        context: { kind: "graphic_designer_prompt", slug: p.slug },
      });
      const imagePrompt = promptBrief.trim().slice(0, 500);
      const apiKey = await resolveGeminiApiKey();
      if (apiKey) {
        const img = await generateImagenImage({
          apiKey,
          prompt: imagePrompt,
        });
        if (img.ok) {
          attachments.push({
            filename: `hero-${p.slug}.png`,
            content: img.base64,
          });
          graphicSection = `<h2>Graphic designer (Imagen 4 Ultra)</h2><p>Prompt used (flash-lite draft):</p><pre>${esc(imagePrompt)}</pre><p>Image attached: <code>hero-${esc(p.slug)}.png</code></p>`;
        } else {
          graphicSection = `<h2>Graphic designer (Imagen 4 Ultra)</h2><p><strong>Image generation failed:</strong> ${esc(img.error)}</p><pre>${esc(imagePrompt)}</pre>`;
        }
      } else {
        graphicSection =
          "<h2>Graphic designer</h2><p>GEMINI_API_KEY missing — skipped Imagen.</p>";
      }
    } catch (e) {
      graphicSection = `<h2>Graphic designer</h2><p>${esc(String(e))}</p>`;
    }
  }

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:900px">
<h1>Compliance officer — new article published</h1>
<p><strong>${esc(p.title)}</strong> · <code>${esc(p.slug)}</code> · ${esc(p.articlePath)}</p>
${p.contentVerticalId ? `<p>Vertical: <strong>${esc(p.contentVerticalLabel ?? "")}</strong> <code>${esc(p.contentVerticalId)}</code></p>` : ""}
<p><em>Advisory only — no automatic veto. Triggered on every successful site publish when compliance email is enabled. Publishing Manager approved this run (see below). <strong>Cc: Chief AI / Executives</strong> in the draft section are for your records only — not sent as separate Resend recipients.</em></p>

<h2>Compliance officer memo (risk + draft email)</h2>
<pre style="white-space:pre-wrap;background:#f0f4ff;padding:14px;border-radius:8px;border:1px solid #c7d2fe">${esc(complianceMd)}</pre>

<h2>Who approved</h2>
<p><strong>Publishing Manager</strong> (Gemini, same ladder as production). First lines:</p>
<pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:8px">${esc(p.managerOutput.slice(0, 6000))}</pre>

<h2>Supporting — quality assurance (flash-lite)</h2>
<pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px">${esc(qaMd)}</pre>

<h2>Supporting — risk &amp; reputation (flash-lite)</h2>
<pre style="white-space:pre-wrap;background:#fff8f0;padding:12px;border-radius:8px">${esc(riskMd)}</pre>

<h2>Supporting — Chief-line process audit (flash-lite)</h2>
<pre style="white-space:pre-wrap;background:#f4fbf4;padding:12px;border-radius:8px">${esc(chiefAuditMd)}</pre>

${graphicSection}

<h2>Agentic log tail (raw)</h2>
<pre style="white-space:pre-wrap;font-size:11px;background:#111;color:#eee;padding:12px;border-radius:8px;max-height:480px;overflow:auto">${esc(readEvents(p.cwd).slice(-25).map((e) => JSON.stringify(e)).join("\n"))}</pre>
</body></html>`;

  const subject = `[Xalura compliance] ${p.title.slice(0, 72)}`;
  const sent = await sendResendEmail({
    to,
    subject,
    html,
    text: `Compliance officer report for ${p.title}\nSlug: ${p.slug}\nOpen the HTML email for the memo, draft Cc lines (display only), supporting analyst notes, and any attachment.`,
    attachments: attachments.length ? attachments : undefined,
  });

  if (sent.error) {
    appendFailedOperation(
      {
        kind: "other",
        message: `Compliance / founder oversight Resend: ${sent.error}`,
        detail: `to=${to}`,
      },
      p.cwd,
    );
  }
}
