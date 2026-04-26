import path from "path";
import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";
import { readFileUtf8Agentic } from "./agenticDisk";
import type { ChiefPublishDigestParams } from "./chiefPublishDigest";
import { waitUntilAfterResponse } from "./cloudflareWaitUntil";
import { appendFailedOperation, readFailedQueue } from "./failedQueue";
import { generateHeroImage } from "./heroImageGenerate";
import { readEvents } from "./eventQueue";
import { sendResendEmail } from "./phase7Clients";
import { resolveWorkerEnv } from "./resolveWorkerEnv";
import {
  complianceOfficerDisplayName,
  graphicDesignerDisplayName,
} from "./agentNames";
import { loadAgentNamesResolved } from "@/lib/loadAgentNamesResolved";
import {
  complianceOfficerEmailSignatureHtmlSync,
  complianceOfficerEmailSignaturePlainSync,
} from "@/lib/chiefEmailBranding";
import { complianceMemoMarkdownToEmailHtml } from "@/lib/complianceMemoHtml";
import { resolveGeminiApiKey, runAgent } from "./gemini";
import { getAgenticRoot } from "./paths";
import { COMPLIANCE_OFFICER_RUBRIC } from "./complianceOfficerRubric";

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

  const h = (p.managerRejectionHistory ?? []).filter(Boolean);
  const rejectBlock =
    h.length > 0
      ? h.map((r, i) => `${i + 1}. ${r.replace(/\s+/g, " ").trim()}`).join("\n")
      : "(none)";

  return [
    `TITLE: ${p.title}`,
    `SLUG: ${p.slug}  PATH: ${p.articlePath}`,
    p.contentVerticalId
      ? `VERTICAL: ${p.contentVerticalLabel ?? ""} (${p.contentVerticalId})`
      : "",
    `escalationPhaseIndex=${p.escalationPhaseIndex ?? 0}  managerAttempts=${p.managerAttempts}`,
    "",
    "=== Manager rejections (before final APPROVE, this phase) ===",
    rejectBlock,
    "",
    "=== Publishing Manager (final approval output) ===",
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
 * Optional **Graphic designer** uses **Leonardo** (photoreal, default when `LEONARDO_API_KEY` is set) or **Imagen** + `GEMINI_API_KEY`.
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
  if (!on) {
    console.info(
      "[founder_oversight] compliance email skipped: set AGENTIC_COMPLIANCE_ON_PUBLISH or AGENTIC_FOUNDER_OVERSIGHT_ON_PUBLISH to true (or 1) on this host.",
    );
    return;
  }

  const to =
    (await resolveWorkerEnv("AGENTIC_COMPLIANCE_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_FOUNDER_OVERSIGHT_EMAIL"))?.trim() ||
    (await resolveWorkerEnv("AGENTIC_CHIEF_DIGEST_EMAIL"))?.trim();
  if (!to) {
    console.info(
      "[founder_oversight] compliance email skipped: no recipient — set AGENTIC_COMPLIANCE_EMAIL (preferred), AGENTIC_FOUNDER_OVERSIGHT_EMAIL, or AGENTIC_CHIEF_DIGEST_EMAIL.",
    );
    return;
  }

  const cwd = p.cwd;
  const nameCfg = await loadAgentNamesResolved(cwd);
  const complianceName = complianceOfficerDisplayName(cwd, nameCfg);
  const coNta = nameCfg.complianceOfficer;
  const signatureOverrides = {
    name: coNta?.name?.trim() || "Martin Cruz",
    title: (coNta?.title?.trim() || "Head of Compliance") as string,
  };
  const graphicName = graphicDesignerDisplayName(cwd, nameCfg);
  const resolveHeroImageLabel = async (): Promise<string> => {
    const prov = (await resolveWorkerEnv("AGENTIC_HERO_IMAGE_PROVIDER"))?.trim().toLowerCase();
    const leo = (await resolveWorkerEnv("LEONARDO_API_KEY"))?.trim();
    if (prov === "imagen" || (prov !== "leonardo" && !leo)) {
      return "Google Imagen";
    }
    return "Leonardo AI (photoreal)";
  };

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

  const memoDate = new Date().toISOString().slice(0, 10);
  const complianceTask = `You are **${complianceName}**, **Head of Compliance** for Xalura Tech. The **article** is **already live**; this is an **internal compliance & content-risk memorandum** (advisory — **no veto**).

**Voice:** write like a **real company** compliance or **outside counsel** memo: numbered issues, short paragraphs, defined terms, no chatty tone, **no** repeating the same fact in three places. **Synthesize** the internal analyst notes — do **not** paste them verbatim.

**Risk:** if the Risk analyst’s output contains a first line \`RISK_LEVEL: …\`, **honor** it; do not contradict it.

${COMPLIANCE_OFFICER_RUBRIC}

### Use these **markdown** section headings **in order** (##):

## Cover
One short block: "MEMORANDUM" · Date **${memoDate}** · **TO:** Chief Executive (internal) · **FROM:** ${complianceName}, Head of Compliance · **RE:** ${p.title} (${p.articlePath}) · one line: **Confidential — internal management & compliance use only** (not for public distribution without approval).

## Executive summary
3–6 tight paragraphs: net assessment, key drivers of the overall score, and what you are recommending **monitor** (not people blame).

## Scope and materials reviewed
What you had (briefing, manager/executive path, excerpt) and explicit limits (what you did not review, e.g. off-platform ads).

## Summary of published content
Neutral, accurate summary of subject matter and claims — **briefing only**.

## Scored assessment (D1–D7)
- One markdown **table** with columns: **Dimension** | **Score (1–10) or INSUFFICIENT_DATA** | **Evidence (short)**.
- Then **exactly** these two lines on their own (machine-parseable):
- \`COMPLIANCE_SCORE_OVERALL: X.X/10\`
- \`COMPLIANCE_CONFIDENCE: HIGH\` or \`MEDIUM\` or \`LOW\`

## Substantive analysis (content & reputation risk)
Counsel-style discussion tied to the scores and the Risk level. Reference **Publishing Manager** approval and **Executive summary** as **process context**, not a substitute for your independent assessment of **content risk**.

## General legal considerations (not legal advice)
A dedicated section: **jurisdiction-agnostic** topics that **qualified counsel** often reviews for **public marketing content** (e.g. misleading claims, professional advice boundaries, comparative statements, privacy representations). This must read like **prudent** in-house guidance. **State clearly** that this section is **general** commentary for the business, is **not** a legal opinion, is **not** legal advice to any person, and is **not** a substitute for **retaining licensed counsel** where required. You may still give **practical, ordinary-course** recommendations (e.g. consider adding a brief informational disclaimer in future similar pieces if…).

## Monitoring and next steps
Concrete follow-ups for the **next** publish cycle or policy review.

## Reliance and limitations
Standard close: based on materials provided; no guarantee of outcome; new facts may change the view.

## Distribution note (at most 4 lines)
State that copies may be shared with **Chief AI** and **Executives** for **context only** unless management directs otherwise. **Do not** produce a second full "forwardable" email that duplicates the entire memorandum.

---
## PRIMARY BRIEFING (authoritative — ground all factual claims here)
${briefing.slice(0, 32_000)}

---
## INTERNAL — Quality assurance (synthesize; do not copy)
${qaMd.slice(0, 6000)}

---
## INTERNAL — Risk (synthesize; honor RISK_LEVEL)
${riskMd.slice(0, 6000)}

---
## INTERNAL — Chief-line process (synthesize only)
${chiefAuditMd.slice(0, 6000)}
---`;

  try {
    complianceMd = await runAgent({
      role: "Worker",
      department: "Compliance Officer (advisory)",
      task: complianceTask,
      context: { kind: "compliance_officer_memo", slug: p.slug },
      assignedName: complianceName,
    });
  } catch (e) {
    complianceMd = `_(Compliance memo failed: ${esc(String(e))})_`;
  }

  const gdFlag = (await resolveWorkerEnv("AGENTIC_GRAPHIC_DESIGNER_ON_PUBLISH"))
    ?.trim()
    .toLowerCase();
  const gdOn = gdFlag === "true" || gdFlag === "1";
  const gModelLabel = await resolveHeroImageLabel();
  if (p.precomputedHero) {
    attachments.push({
      filename: p.precomputedHero.filename,
      content: p.precomputedHero.content,
    });
    graphicSection = `<h2>Graphic designer (${esc(gModelLabel)})</h2><p>Prompt used (flash-lite draft):</p><pre>${esc(p.precomputedHero.imagePrompt)}</pre><p>Image attached: <code>${esc(p.precomputedHero.filename)}</code> (same asset as article cover when upload succeeded).</p>`;
  } else if (gdOn) {
    try {
      const promptBrief = await runAgent({
        role: "Worker",
        department: "Publishing — Graphic Designer",
        task: `You are the **Graphic Designer**. Produce **only** a single compact English image generation prompt (max 500 characters) for the **hero image** of this published article. No quotes, no markdown — raw prompt text only.

**Visual style (mandatory):** **Photorealistic** — believable real or documentary scene, professional editorial or product photography, natural light, sharp focus. **Not** cartoon, anime, vector, illustration, or plastic CGI look unless the article is explicitly about that medium.

Article title: ${p.title}
Executive summary:
${p.executiveSummary.slice(0, 2000)}`,
        context: { kind: "graphic_designer_prompt", slug: p.slug },
        assignedName: graphicName,
      });
      const imagePrompt = promptBrief.trim().slice(0, 500);
      if (!(await resolveGeminiApiKey())) {
        graphicSection =
          "<h2>Graphic designer</h2><p>GEMINI_API_KEY missing (needed for art-brief; set <code>LEONARDO_API_KEY</code> for Leonardo render).</p>";
      } else {
        const img = await generateHeroImage({ prompt: imagePrompt });
        if (img.ok) {
          const ext =
            img.mimeType?.toLowerCase().includes("jpeg") || img.mimeType?.includes("jpg")
              ? "jpg"
              : "png";
          attachments.push({
            filename: `hero-${p.slug}.${ext}`,
            content: img.base64,
          });
          graphicSection = `<h2>Graphic designer (${esc(gModelLabel)})</h2><p>Prompt used (flash-lite draft):</p><pre>${esc(imagePrompt)}</pre><p>Image attached: <code>hero-${esc(p.slug)}.${ext}</code></p>`;
        } else {
          graphicSection = `<h2>Graphic designer (${esc(gModelLabel)})</h2><p><strong>Image generation failed:</strong> ${esc(img.error)}</p><pre>${esc(imagePrompt)}</pre>`;
        }
      }
    } catch (e) {
      graphicSection = `<h2>Graphic designer</h2><p>${esc(String(e))}</p>`;
    }
  }

  const memoBodyHtml = complianceMemoMarkdownToEmailHtml(complianceMd);
  const sigHtml = complianceOfficerEmailSignatureHtmlSync(signatureOverrides);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#e8e8e4;">
<div style="max-width:720px;margin:0 auto;background:#fafaf8;border:1px solid #c8c8c0;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<div style="padding:28px 32px 8px 32px;border-bottom:2px solid #1a1a16;">
<p style="margin:0 0 6px 0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#4a4a45;font-family:Georgia,serif;">Internal — content risk &amp; compliance</p>
<h1 style="margin:0 0 8px 0;font-size:22px;font-weight:600;color:#0a0a0a;font-family:Georgia,serif;">Memorandum — published article</h1>
<p style="margin:0 0 4px 0;font-size:14px;color:#333;font-family:system-ui,Segoe UI,sans-serif;"><strong>${esc(
    p.title,
  )}</strong> · <code style="font-size:13px;">${esc(p.slug)}</code></p>
<p style="margin:0;font-size:14px;font-family:system-ui,Segoe UI,sans-serif;">Path: <strong>${esc(p.articlePath)}</strong></p>
${
  p.contentVerticalId
    ? `<p style="margin:10px 0 0 0;font-size:13px;font-family:system-ui,sans-serif;color:#444;">Vertical: <strong>${esc(
        p.contentVerticalLabel ?? "",
      )}</strong> <code>${esc(p.contentVerticalId)}</code></p>`
    : ""
}
</div>
<div style="padding:8px 32px 0 32px;">
<p style="font-size:13px;line-height:1.5;color:#3d3d38;font-family:system-ui,sans-serif;margin:20px 0 16px 0;"><em>Advisory memorandum. Publication is not withdrawn. Publishing Manager and Executive sign-off are summarized in the body below. Open the appendices in your mail client for raw analyst notes if needed.</em></p>
</div>
<div style="padding:0 32px 8px 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.62;color:#1a1a1a;">
${memoBodyHtml}
</div>
<div style="padding:0 32px 28px 32px;">${sigHtml}</div>
<details style="padding:0 32px 24px 32px;font-family:system-ui,sans-serif;font-size:12px;">
<summary style="cursor:pointer;font-weight:600;color:#333;">Appendix — manager approval (excerpt)</summary>
<pre style="white-space:pre-wrap;background:#f2f2ee;padding:12px;border-radius:6px;border:1px solid #d8d8d0;max-height:400px;overflow:auto;margin:10px 0 0 0;">${esc(p.managerOutput.slice(0, 8000))}</pre>
</details>
<details style="padding:0 32px 16px 32px;font-family:system-ui,sans-serif;font-size:12px;">
<summary style="cursor:pointer;font-weight:600;color:#333;">Appendix — internal QA, Risk, Chief process (synthesis source)</summary>
<div style="margin-top:10px;">
<p style="font-size:11px;font-weight:600;margin:0 0 4px 0;">Quality assurance</p>
<pre style="white-space:pre-wrap;background:#f9fafb;padding:10px;border-radius:6px;border:1px solid #e5e5e0;max-height:280px;overflow:auto;">${esc(qaMd)}</pre>
<p style="font-size:11px;font-weight:600;margin:10px 0 4px 0;">Risk &amp; reputation</p>
<pre style="white-space:pre-wrap;background:#fffaf5;padding:10px;border-radius:6px;border:1px solid #e8e0d8;max-height:280px;overflow:auto;">${esc(riskMd)}</pre>
<p style="font-size:11px;font-weight:600;margin:10px 0 4px 0;">Chief-line process</p>
<pre style="white-space:pre-wrap;background:#f4fbf4;padding:10px;border-radius:6px;border:1px solid #d8e8d8;max-height:280px;overflow:auto;">${esc(chiefAuditMd)}</pre>
</div>
</details>
${graphicSection}
<details style="padding:0 32px 32px 32px;font-family:system-ui,sans-serif;font-size:11px;">
<summary style="cursor:pointer;font-weight:600;color:#555;">Raw agentic log tail (technical)</summary>
<pre style="white-space:pre-wrap;font-size:10px;background:#1a1a1a;color:#e8e8e0;padding:12px;border-radius:6px;max-height:400px;overflow:auto;margin:10px 0 0 0;">${esc(
    readEvents(p.cwd)
      .slice(-20)
      .map((e) => JSON.stringify(e))
      .join("\n"),
  )}</pre>
</details>
</div>
</body></html>`;

  const subject = `[Xalura] Compliance memorandum — ${p.title.slice(0, 72)}`;
  const textPlain = [
    `COMPLIANCE MEMORANDUM — ${p.title}`,
    `Path: ${p.articlePath}  |  slug: ${p.slug}`,
    "",
    complianceMd,
    "",
    complianceOfficerEmailSignaturePlainSync(signatureOverrides),
    "",
    "— Full HTML version uses formatted headings and table where applicable; appendices: manager output and internal QA / Risk / Chief process notes. —",
  ].join("\n");
  const sent = await sendResendEmail({
    to,
    subject,
    html,
    text: textPlain,
    attachments: attachments.length ? attachments : undefined,
  });

  if (sent.error) {
    console.warn(
      `[founder_oversight] Resend failed (${sent.error}) — check RESEND_API_KEY / RESEND_FROM; to=${to}`,
    );
    appendFailedOperation(
      {
        kind: "other",
        message: `Compliance / founder oversight Resend: ${sent.error}`,
        detail: `to=${to}`,
      },
      p.cwd,
    );
    fireAgenticPipelineLog({
      department: "compliance",
      stage: "founder_oversight_email",
      event: "error",
      summary: `Compliance email Resend failed: ${sent.error} (slug ${p.slug})`,
      detail: { slug: p.slug, to },
    });
  } else {
    fireAgenticPipelineLog({
      department: "compliance",
      stage: "founder_oversight_email",
      event: "sent",
      summary: `Compliance / founder oversight memo sent for “${p.title.slice(0, 80)}” (${p.slug})`,
      detail: { slug: p.slug, to },
    });
  }
}
