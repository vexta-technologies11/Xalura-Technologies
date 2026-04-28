/**
 * Phase 7 — optional third-party HTTP clients (Resend, Firecrawl, Zernio, GSC).
 * Each reads keys via `resolveWorkerEnv` so Cloudflare Worker bindings work.
 */

import { resolveWorkerEnv } from "./resolveWorkerEnv";
import { geminiExtractFromHtml, geminiConfigured } from "./geminiClient";
import { fireAgenticPipelineLog } from "@/lib/agenticPipelineLogSupabase";

export type Phase7Configured = {
  resend: boolean;
  firecrawl: boolean;
  zernio: boolean;
  google_search_console: boolean;
  gemini: boolean;
};

export async function getPhase7Configured(): Promise<Phase7Configured> {
  const [
    resend,
    firecrawl,
    zernio,
    gscId,
    gscSecret,
    gscRefresh,
    gscSite,
    geminiKey,
  ] = await Promise.all([
    resolveWorkerEnv("RESEND_API_KEY"),
    resolveWorkerEnv("FIRECRAWL_API_KEY"),
    resolveWorkerEnv("ZERNIO_API_KEY"),
    resolveWorkerEnv("GOOGLE_SC_CLIENT_ID"),
    resolveWorkerEnv("GOOGLE_SC_SECRET"),
    resolveWorkerEnv("GOOGLE_SC_REFRESH_TOKEN"),
    resolveWorkerEnv("GOOGLE_SC_SITE_URL"),
    resolveWorkerEnv("GEMINI_API_KEY"),
  ]);
  return {
    resend: !!resend,
    firecrawl: !!firecrawl,
    zernio: !!zernio,
    google_search_console: !!(gscId && gscSecret && gscRefresh && gscSite),
    gemini: !!geminiKey,
  };
}

/** Resend transactional email. `from` defaults to `RESEND_FROM` or `onboarding@resend.dev`. */
export async function sendResendEmail(input: {
  from?: string;
  to: string | string[];
  /** Optional CC recipients (verified domains in Resend). */
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Resend attachments — each `content` is raw base64 (no data: prefix). */
  attachments?: { filename: string; content: string }[];
  /** Same-thread replies (Resend `reply_to` field). */
  replyTo?: string | string[];
  /** e.g. `In-Reply-To` / `References` for email threading. */
  headers?: Record<string, string>;
}): Promise<{ id?: string; error?: string }> {
  const key = await resolveWorkerEnv("RESEND_API_KEY");
  if (!key) return { error: "RESEND_API_KEY not set" };
  const from =
    input.from?.trim() ||
    (await resolveWorkerEnv("RESEND_FROM")) ||
    "onboarding@resend.dev";
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const payload: Record<string, unknown> = {
    from,
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  };
  if (input.cc !== undefined) {
    const cc = (Array.isArray(input.cc) ? input.cc : [input.cc]).filter(
      (x) => typeof x === "string" && x.trim().length > 0,
    );
    if (cc.length > 0) payload["cc"] = cc;
  }
  if (input.bcc !== undefined) {
    const bcc = (Array.isArray(input.bcc) ? input.bcc : [input.bcc]).filter(
      (x) => typeof x === "string" && x.trim().length > 0,
    );
    if (bcc.length > 0) payload["bcc"] = bcc;
  }
  if (input.replyTo !== undefined) {
    payload["reply_to"] = Array.isArray(input.replyTo) ? input.replyTo : [input.replyTo];
  }
  if (input.headers && Object.keys(input.headers).length > 0) {
    payload["headers"] = input.headers;
  }
  if (input.attachments?.length) {
    payload["attachments"] = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    }));
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof body["message"] === "string"
        ? body["message"]
        : `Resend HTTP ${res.status}`;
    return { error: err };
  }
  const id = typeof body["id"] === "string" ? body["id"] : undefined;
  return { id };
}

const FIRECRAWL_DEFAULT = "https://api.firecrawl.dev";

/** Scrape a public URL to markdown (and optional HTML) via Firecrawl v1. */
export async function firecrawlScrape(
  url: string,
  formats: ("markdown" | "html")[] = ["markdown"],
): Promise<{ markdown?: string; html?: string; error?: string }> {
  // Prefer Gemini extraction when available and enabled; fallback to Firecrawl API.
  try {
    const useGemini = (await resolveWorkerEnv("AGENTIC_USE_GEMINI"))?.trim() !== "0" && (await geminiConfigured());
    const gemOnly = (await resolveWorkerEnv("AGENTIC_GEMINI_ONLY"))?.trim() === "1";
    if (useGemini) {
      try {
        const fetched = await fetch(url, { method: "GET" });
        if (fetched.ok) {
          const htmlText = await fetched.text().catch(() => "");
          if (htmlText) {
            const g = await geminiExtractFromHtml(htmlText, { maxChars: 20000 });
            if (g.markdown) return { markdown: g.markdown };
          }
        }
      } catch (err) {
        // ignore and fall through to Firecrawl (unless gemini-only)
      }
      if (gemOnly) {
        try {
          fireAgenticPipelineLog({
            department: "phase7",
            agentLaneId: null,
            stage: "firecrawl_extract",
            event: "gemini_only_skipped_firecrawl",
            summary: `Gemini-only prevented Firecrawl fallback for url: ${url}`,
            detail: { url: url.slice(0, 400) },
          });
        } catch {
          // best effort
        }
        return { error: "AGENTIC_GEMINI_ONLY=1: Gemini extraction failed or returned no markdown" };
      }
    }

    const key = await resolveWorkerEnv("FIRECRAWL_API_KEY");
    if (!key) return { error: "FIRECRAWL_API_KEY not set" };
    const base =
      (await resolveWorkerEnv("FIRECRAWL_BASE_URL"))?.replace(/\/$/, "") ||
      FIRECRAWL_DEFAULT;
    const res = await fetch(`${base}/v1/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        typeof json["message"] === "string"
          ? json["message"]
          : typeof json["error"] === "string"
            ? json["error"]
            : `Firecrawl HTTP ${res.status}`;
      return { error: msg };
    }
    const data = json["data"] as Record<string, unknown> | undefined;
    const markdown =
      data && typeof data["markdown"] === "string" ? data["markdown"] : undefined;
    const html =
      data && typeof data["html"] === "string" ? data["html"] : undefined;
    return { markdown, html };
  } catch (err: any) {
    return { error: String(err?.message || err) };
  }
}

const ZERNIO_DEFAULT = "https://zernio.com/api";

function zernioApiBaseFromEnv(raw: string | undefined): string {
  const t = raw?.replace(/\/$/, "").trim();
  if (t && /^https?:\/\//i.test(t)) return t;
  return ZERNIO_DEFAULT;
}

/** List Zernio profiles (validates API key; use before creating posts). */
export async function zernioListProfiles(): Promise<{
  profiles?: unknown[];
  error?: string;
}> {
  const key = await resolveWorkerEnv("ZERNIO_API_KEY");
  if (!key) return { error: "ZERNIO_API_KEY not set" };
  const base = zernioApiBaseFromEnv(await resolveWorkerEnv("ZERNIO_API_BASE"));
  const res = await fetch(`${base}/v1/profiles`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json["error"] === "string"
        ? json["error"]
        : `Zernio HTTP ${res.status}`;
    return { error: err };
  }
  const profiles = Array.isArray(json["profiles"])
    ? json["profiles"]
    : undefined;
  return { profiles };
}

export type ZernioPlatformTarget = {
  platform: string;
  accountId: string;
};

/** Image attachment for create post — see Zernio `mediaItems` (public `https` URL, fetchable by their servers). */
export type ZernioMediaItem = { type: "image"; url: string };

type ZernioAccountListRow = {
  _id?: string;
  platform?: string;
  isActive?: boolean;
};

/**
 * Fetches all **active** connected social accounts (GET /v1/accounts) and maps them to
 * `platforms` payloads for `createPost` with `publishNow: true` (one post, all accounts).
 * @see https://docs.zernio.com/accounts/list-accounts
 */
export async function zernioListActiveAccountTargets(input?: {
  /** When set, adds `?profileId=` so only accounts for that Zernio profile are included. */
  profileId?: string;
}): Promise<{ platforms: ZernioPlatformTarget[]; error?: string }> {
  const key = await resolveWorkerEnv("ZERNIO_API_KEY");
  if (!key) return { platforms: [], error: "ZERNIO_API_KEY not set" };
  const base = zernioApiBaseFromEnv(await resolveWorkerEnv("ZERNIO_API_BASE"));
  const u = new URL(`${base}/v1/accounts`);
  const pid = input?.profileId?.trim();
  if (pid) u.searchParams.set("profileId", pid);
  const res = await fetch(u.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json["error"] === "string"
        ? json["error"]
        : `Zernio list accounts HTTP ${res.status}`;
    return { platforms: [], error: err };
  }
  const raw = json["accounts"];
  if (!Array.isArray(raw)) {
    return { platforms: [], error: "Zernio GET /v1/accounts: missing accounts array" };
  }
  const seen = new Set<string>();
  const platforms: ZernioPlatformTarget[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const row = a as ZernioAccountListRow;
    if (row.isActive === false) continue;
    const id = typeof row._id === "string" && row._id.trim() ? row._id.trim() : "";
    const plat = typeof row.platform === "string" && row.platform.trim() ? row.platform.trim() : "";
    if (!id || !plat || seen.has(id)) continue;
    seen.add(id);
    platforms.push({ platform: plat, accountId: id });
  }
  return { platforms: platforms.length ? platforms : [], error: undefined };
}

/**
 * Create a Zernio post — see https://docs.zernio.com/posts/create-post
 * Use `queuedFromProfile` **or** `platforms` + `publishNow` per your account setup.
 */
export async function zernioCreatePost(input: {
  title?: string;
  content: string;
  /** When set, platforms that support images attach this as post media (same caption in `content`). */
  mediaItems?: ZernioMediaItem[];
  publishNow?: boolean;
  isDraft?: boolean;
  queuedFromProfile?: string;
  platforms?: ZernioPlatformTarget[];
}): Promise<{ ok: true; status: number; body: unknown } | { ok: false; error: string }> {
  const key = await resolveWorkerEnv("ZERNIO_API_KEY");
  if (!key) return { ok: false, error: "ZERNIO_API_KEY not set" };
  const base = zernioApiBaseFromEnv(await resolveWorkerEnv("ZERNIO_API_BASE"));
  const payload: Record<string, unknown> = {
    content: input.content,
  };
  if (input.title !== undefined) payload["title"] = input.title;
  if (input.mediaItems?.length) payload["mediaItems"] = input.mediaItems;
  if (input.publishNow !== undefined) payload["publishNow"] = input.publishNow;
  if (input.isDraft !== undefined) payload["isDraft"] = input.isDraft;
  if (input.queuedFromProfile) payload["queuedFromProfile"] = input.queuedFromProfile;
  if (input.platforms?.length) payload["platforms"] = input.platforms;

  const res = await fetch(`${base}/v1/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json["error"] === "string"
        ? json["error"]
        : `Zernio posts HTTP ${res.status}`;
    return { ok: false, error: err.slice(0, 500) };
  }
  return { ok: true, status: res.status, body: json };
}

type GscTokenBundle = {
  access_token: string;
  expires_in?: number;
};

async function gscAccessToken(): Promise<string | undefined> {
  const [id, secret, refresh] = await Promise.all([
    resolveWorkerEnv("GOOGLE_SC_CLIENT_ID"),
    resolveWorkerEnv("GOOGLE_SC_SECRET"),
    resolveWorkerEnv("GOOGLE_SC_REFRESH_TOKEN"),
  ]);
  if (!id || !secret || !refresh) return undefined;
  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as GscTokenBundle &
    Record<string, unknown>;
  if (!res.ok || typeof json["access_token"] !== "string") {
    return undefined;
  }
  return json.access_token;
}

/**
 * Search Analytics query (last N days, by query). Requires OAuth refresh + site URL.
 * `siteUrl` example: `https://www.example.com/` (must match Search Console property).
 */
export async function gscSearchAnalyticsQuery(input: {
  startDate: string;
  endDate: string;
  rowLimit?: number;
}): Promise<{ rows?: unknown[]; error?: string }> {
  const siteUrl = await resolveWorkerEnv("GOOGLE_SC_SITE_URL");
  if (!siteUrl) return { error: "GOOGLE_SC_SITE_URL not set" };
  const token = await gscAccessToken();
  if (!token) {
    return {
      error:
        "Google Search Console OAuth not configured (GOOGLE_SC_CLIENT_ID, GOOGLE_SC_SECRET, GOOGLE_SC_REFRESH_TOKEN)",
    };
  }
  const enc = encodeURIComponent(siteUrl);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${enc}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: ["query"],
      rowLimit: input.rowLimit ?? 10,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json["error"] === "object" &&
      json["error"] !== null &&
      typeof (json["error"] as { message?: string }).message === "string"
        ? (json["error"] as { message: string }).message
        : `GSC HTTP ${res.status}`;
    return { error: err };
  }
  const rows = Array.isArray(json["rows"]) ? json["rows"] : [];
  return { rows };
}

/**
 * Search Analytics by **page** URL (for topic-bank audits). Same OAuth + site property as query mode.
 */
export async function gscSearchAnalyticsByPage(input: {
  startDate: string;
  endDate: string;
  rowLimit?: number;
}): Promise<{ rows?: unknown[]; error?: string }> {
  const siteUrl = await resolveWorkerEnv("GOOGLE_SC_SITE_URL");
  if (!siteUrl) return { error: "GOOGLE_SC_SITE_URL not set" };
  const token = await gscAccessToken();
  if (!token) {
    return {
      error:
        "Google Search Console OAuth not configured (GOOGLE_SC_CLIENT_ID, GOOGLE_SC_SECRET, GOOGLE_SC_REFRESH_TOKEN)",
    };
  }
  const enc = encodeURIComponent(siteUrl);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${enc}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: ["page"],
      rowLimit: input.rowLimit ?? 100,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json["error"] === "object" &&
      json["error"] !== null &&
      typeof (json["error"] as { message?: string }).message === "string"
        ? (json["error"] as { message: string }).message
        : `GSC HTTP ${res.status}`;
    return { error: err };
  }
  const rows = Array.isArray(json["rows"]) ? json["rows"] : [];
  return { rows };
}
