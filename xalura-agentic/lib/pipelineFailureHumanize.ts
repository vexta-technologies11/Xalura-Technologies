import {
  CHIEF_EMAIL_MAX_WORDS,
  pickChiefEmailReplySalutation,
} from "@/lib/chiefEmailBranding";
import type { FailedOperation } from "./failedQueue";

const MAX_WORDS_BRIEF = 95;

function clipWords(s: string, maxWords: number = MAX_WORDS_BRIEF): string {
  const words = s.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function haystack(op: FailedOperation): string {
  return `${op.message}\n${op.detail ?? ""}`.toLowerCase();
}

/** Plain-English lead for ops Resend (under ~100 words); technical block appended separately. */
export function opsAlertBriefFromFailedOperation(op: FailedOperation): string {
  const m = op.message.replace(/\s+/g, " ").trim();
  if (/^mr\.?\s+president/i.test(m)) {
    return clipWords(m);
  }
  const hay = haystack(op);
  if (hay.includes("no topic bank on disk")) {
    return clipWords(
      "Mr President — SEO could not start because the keyword vault file on this server is missing or unreadable. Publishing is standing by; we need a topic-bank refresh or disk path fix before any lane can draft.",
    );
  }
  if (hay.includes("cannot be saved") || hay.includes("read-only agentic")) {
    return clipWords(
      "Mr President — SEO could not **persist** the keyword vault. On Cloudflare, set `AGENTIC_TOPIC_BANK_USE_SUPABASE=true` and bind `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on the Worker, or run from a host with writable `xalura-agentic/state`.",
    );
  }
  if (hay.includes("topic bank refresh failed")) {
    return clipWords(
      "Mr President — SEO tried to refill the keyword bank from the web and the crawl failed. Usually SerpAPI, Firecrawl, or Gemini is misconfigured, rate-limited, or unreachable from this host.",
    );
  }
  if (hay.includes("no unused topic for vertical") || hay.includes("crawl cooldown")) {
    return clipWords(
      "Mr President — the bank exists but this vertical has no fresh keyword lined up, or the crawl cooldown blocked a refill. A forced refresh or waiting for the interval usually clears it.",
    );
  }
  if (hay.includes("publishing waiting") || hay.includes("keyword_ready")) {
    return clipWords(
      "Mr President — Publishing is waiting on SEO: the keyword handoff bundle never arrived or cleared review, so nothing moved to draft.",
    );
  }
  if (hay.includes("site publish failed")) {
    return clipWords(
      "Mr President — copy cleared the desk but the live site upsert failed. Supabase keys, RLS, or network from this server are the usual suspects.",
    );
  }
  if (
    hay.includes("article cover upload") ||
    hay.includes("publishing hero image") ||
    hay.includes("imagen predict") ||
    hay.includes("article-covers")
  ) {
    return clipWords(
      "Mr President — the **Graphic designer / hero image** step failed (Leonardo, Imagen, or Supabase Storage `article-covers`). See the technical block for the exact API message — often missing `LEONARDO_API_KEY` / API credits, wrong `LEONARDO_MODEL_ID`, or a missing Storage bucket/policy.",
    );
  }
  return clipWords(
    `Mr President — an automated pipeline step failed. Start with the technical block below for the exact desk; first guess is ${op.kind === "pipeline" ? "SEO, Publishing, or site publish" : "the integration named in the log"}.`,
  );
}

export function humanOpsAlertEmailBody(op: FailedOperation): string {
  const brief = opsAlertBriefFromFailedOperation(op);
  const technical = [
    "--- technical ---",
    `kind: ${op.kind}`,
    `message: ${op.message}`,
    op.detail ? `detail:\n${op.detail}` : "",
    `id: ${op.id}  ts: ${op.ts}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${brief}\n\n${technical}`;
}

export function humanIncrementalSeoFailureMessage(
  input: {
    status: string;
    reason?: string;
    stage?: string;
    message?: string;
  },
  verticalLabel: string,
): string {
  const r = `${input.reason ?? ""} ${input.message ?? ""}`.toLowerCase();
  if (input.status === "blocked" && r.includes("no topic bank")) {
    return clipWords(
      `Mr President — the SEO desk for “${verticalLabel}” stopped because the topic bank file is missing or unreadable after the gate step, so no keyword was assigned. Manual publish **does** run SEO first; if crawls succeed in logs but this repeats, the server likely cannot **write** \`xalura-agentic/state\` (read-only Workers). Run from Node/Vercel with disk or fix persistence.`,
    );
  }
  if (
    r.includes("read-only") ||
    r.includes("cannot be saved") ||
    r.includes("persist") ||
    r.includes("read-back")
  ) {
    return clipWords(
      `Mr President — SEO for “${verticalLabel}” could not **persist** the keyword vault. On Cloudflare, set \`AGENTIC_TOPIC_BANK_USE_SUPABASE=true\` **and** bind \`NEXT_PUBLIC_SUPABASE_URL\` + \`SUPABASE_SERVICE_ROLE_KEY\` on the Worker (not only process env), or use writable disk. Publishing waits until the vault saves.`,
    );
  }
  if (r.includes("topic bank refresh failed")) {
    return clipWords(
      `Mr President — SEO for “${verticalLabel}” attempted a fresh crawl to fill the vault and upstream tools returned an error. Check SerpAPI, Firecrawl, and Gemini credentials and quotas on this deployment.`,
    );
  }
  if (r.includes("no unused topic") || r.includes("crawl cooldown")) {
    return clipWords(
      `Mr President — SEO for “${verticalLabel}” found no unused keyword for this lane, or the minimum crawl interval blocked a refill. Another vertical may still have supply; this lane needs a refresh or time.`,
    );
  }
  if (input.status === "blocked") {
    return clipWords(
      `Mr President — the SEO lane “${verticalLabel}” halted on policy or supply: ${input.reason ?? "see technical log"}. Publishing did not receive a keyword.`,
    );
  }
  if (input.status === "rejected" || input.status === "rejected_after_escalation") {
    return clipWords(
      `Mr President — SEO for “${verticalLabel}” declined the topic after review: ${input.reason ?? "see technical log"}.`,
    );
  }
  if (input.status === "error") {
    return clipWords(
      `Mr President — the SEO desk for “${verticalLabel}” threw an error during ${input.stage ?? "processing"}: ${input.message ?? "see technical log"}.`,
    );
  }
  return clipWords(
    `Mr President — the SEO pass for “${verticalLabel}” did not complete (${input.status}). See the technical attachment for the exact object.`,
  );
}

export function humanIncrementalPublishingFailureMessage(
  input: { status: string; reason?: string; stage?: string; message?: string },
  verticalLabel: string,
): string {
  if (input.status === "waiting") {
    return clipWords(
      `Mr President — Publishing for “${verticalLabel}” is waiting: ${input.reason ?? "handoff not ready"}. SEO may need to run first or clear a gate.`,
    );
  }
  if (input.status === "blocked") {
    return clipWords(
      `Mr President — Publishing for “${verticalLabel}” is blocked: ${input.reason ?? "see technical log"}.`,
    );
  }
  if (input.status === "rejected" || input.status === "rejected_after_escalation") {
    return clipWords(
      `Mr President — Publishing for “${verticalLabel}” rejected the draft: ${input.reason ?? "see technical log"}.`,
    );
  }
  if (input.status === "error") {
    return clipWords(
      `Mr President — Publishing for “${verticalLabel}” failed during ${input.stage ?? "processing"}: ${input.message ?? "see technical log"}.`,
    );
  }
  return clipWords(
    `Mr President — Publishing for “${verticalLabel}” ended with status ${input.status}.`,
  );
}

export function humanIncrementalSiteFailureMessage(error: string, verticalLabel: string): string {
  return clipWords(
    `Mr President — the article for “${verticalLabel}” was approved but the live database publish step failed: ${error}.`,
  );
}

/** Admin JSON: one short paragraph for UI (under ~100 words). Raw `error` stays machine-readable. */
export function humanIncrementalApiBrief(input: {
  stage: "seo" | "publishing" | "site";
  vertical_id: string;
  vertical_label: string;
  detail: unknown;
}): string {
  const label = input.vertical_label || input.vertical_id;
  if (input.stage === "site") {
    const err = typeof input.detail === "string" ? input.detail : JSON.stringify(input.detail);
    return clipWords(humanIncrementalSiteFailureMessage(err, label), 98);
  }
  const d = input.detail;
  if (!d || typeof d !== "object") {
    return clipWords(`Mr President — ${input.stage} failed for “${label}”.`, 98);
  }
  const o = d as Record<string, unknown>;
  const status = String(o["status"] ?? "");
  if (input.stage === "seo") {
    return clipWords(
      humanIncrementalSeoFailureMessage(
        {
          status,
          reason: typeof o["reason"] === "string" ? o["reason"] : undefined,
          stage: typeof o["stage"] === "string" ? o["stage"] : undefined,
          message: typeof o["message"] === "string" ? o["message"] : undefined,
        },
        label,
      ),
      98,
    );
  }
  return clipWords(
    humanIncrementalPublishingFailureMessage(
      {
        status,
        reason: typeof o["reason"] === "string" ? o["reason"] : undefined,
        stage: typeof o["stage"] === "string" ? o["stage"] : undefined,
        message: typeof o["message"] === "string" ? o["message"] : undefined,
      },
      label,
    ),
    98,
  );
}

export function humanChiefDigestEmailBody(input: {
  department: string;
  auditFileRelative: string;
  agentLaneKey?: string;
  cwdLabel?: string;
}): { subject: string; text: string } {
  const lane = input.agentLaneKey ? ` (${input.agentLaneKey})` : "";
  const cwd = input.cwdLabel ? ` [${input.cwdLabel}]` : "";
  const lead = pickChiefEmailReplySalutation();
  const text = clipWords(
    `${lead} ${input.department} audit logged in ${input.auditFileRelative}${lane}. Routine governance, not an alert.${cwd}`.replace(/\s+/g, " ").trim(),
    CHIEF_EMAIL_MAX_WORDS,
  );
  return {
    subject: `Ops note — ${input.department} audit (CAI)`,
    text,
  };
}
