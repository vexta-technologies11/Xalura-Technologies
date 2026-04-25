import path from "path";
import {
  appendFileUtf8Agentic,
  fileExistsAgentic,
  mkdirRecursiveAgentic,
  readFileUtf8Agentic,
} from "./agenticDisk";
import { getAgenticRoot } from "./paths";

const FILE = "event-queue.log";

export type KeywordReadyPayload = {
  bundle_id: string;
  keywords: string[];
  /** Topic bank or logical row id; ties handoff to a single pipeline instance. */
  topic_id?: string;
  /** From topic bank when SEO ran with `useTopicBank`. */
  content_type?: "article" | "course";
  subcategory?: string;
  source_urls?: string[];
  /** Matched SEO ↔ Publishing lane (`CONTENT_VERTICALS`). */
  vertical_id?: string;
  vertical_label?: string;
  /**
   * 10-point quality contract for Publishing; must be honored by Worker/Manager/Executive
   * and available for Chief context.
   */
  checklist?: string[];
};

export type ArticlePublishedPayload = {
  article_id: string;
  title: string;
  url?: string;
  /** Matches `KeywordReadyPayload.topic_id` when publishing used explicit handoff. */
  topic_id?: string;
};

export type AuditCompletePayload = {
  department: string;
  audit_file: string;
};

export type TopicBankRefreshedPayload = {
  topic_count: number;
  crawl_count: number;
  vertical_catalog_size?: number;
  trend_log_path?: string;
  /** When set, bank was refilled with one `sc-…` topic per public subcategory. */
  mode?: "catalog_serp" | "ten_pillars";
};

export type AgenticEvent =
  | {
      id: string;
      ts: string;
      type: "KEYWORD_READY";
      payload: KeywordReadyPayload;
    }
  | {
      id: string;
      ts: string;
      type: "ARTICLE_PUBLISHED";
      payload: ArticlePublishedPayload;
    }
  | {
      id: string;
      ts: string;
      type: "WAITING";
      payload: { department: string; reason: string };
    }
  | {
      id: string;
      ts: string;
      type: "AUDIT_COMPLETE";
      payload: AuditCompletePayload;
    }
  | {
      id: string;
      ts: string;
      type: "TOPIC_BANK_REFRESHED";
      payload: TopicBankRefreshedPayload;
    };

export type AgenticEventType = AgenticEvent["type"];

/**
 * When `xalura-agentic/shared/event-queue.log` cannot be written (read-only Workers),
 * `appendFileUtf8Agentic` is a no-op but SEO still needs Publishing to see `KEYWORD_READY`
 * in the same request. We mirror the latest event per (cwd, type) in memory for this isolate.
 */
const latestInProcessByCwdType = new Map<string, AgenticEvent>();

function eventMemoryKey(cwd: string, type: AgenticEventType): string {
  return `${path.resolve(cwd)}\0${type}`;
}

function newerEvent(a: AgenticEvent, b: AgenticEvent): AgenticEvent {
  return a.ts >= b.ts ? a : b;
}

function queuePath(cwd: string): string {
  return path.join(getAgenticRoot(cwd), "shared", FILE);
}

function ensureDir(cwd: string): void {
  mkdirRecursiveAgentic(path.dirname(queuePath(cwd)));
}

export function appendEvent(
  event: Omit<AgenticEvent, "id" | "ts"> & { type: AgenticEventType },
  cwd: string = process.cwd(),
): AgenticEvent {
  ensureDir(cwd);
  const full: AgenticEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ts: new Date().toISOString(),
  } as AgenticEvent;
  appendFileUtf8Agentic(queuePath(cwd), `${JSON.stringify(full)}\n`);
  latestInProcessByCwdType.set(eventMemoryKey(cwd, full.type), full);
  return full;
}

export function readEvents(cwd: string = process.cwd()): AgenticEvent[] {
  const p = queuePath(cwd);
  if (!fileExistsAgentic(p)) return [];
  const raw = readFileUtf8Agentic(p);
  if (raw == null) return [];
  const out: AgenticEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as AgenticEvent);
    } catch {
      /* skip corrupt line */
    }
  }
  return out;
}

export function getLatestEvent(
  type: AgenticEventType,
  cwd: string = process.cwd(),
): AgenticEvent | null {
  const all = readEvents(cwd).filter((e) => e.type === type);
  const fromFile = all.length ? all[all.length - 1]! : null;
  const fromMem = latestInProcessByCwdType.get(eventMemoryKey(cwd, type)) ?? null;
  if (!fromMem) return fromFile;
  if (!fromFile) return fromMem;
  return newerEvent(fromMem, fromFile);
}
