import fs from "fs";
import path from "path";
import { getAgenticRoot } from "./paths";

const FILE = "event-queue.log";

export type KeywordReadyPayload = {
  bundle_id: string;
  keywords: string[];
};

export type ArticlePublishedPayload = {
  article_id: string;
  title: string;
  url?: string;
};

export type AuditCompletePayload = {
  department: string;
  audit_file: string;
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
    };

export type AgenticEventType = AgenticEvent["type"];

function queuePath(cwd: string): string {
  return path.join(getAgenticRoot(cwd), "shared", FILE);
}

function ensureDir(cwd: string): void {
  fs.mkdirSync(path.dirname(queuePath(cwd)), { recursive: true });
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
  fs.appendFileSync(queuePath(cwd), `${JSON.stringify(full)}\n`, "utf8");
  return full;
}

export function readEvents(cwd: string = process.cwd()): AgenticEvent[] {
  const p = queuePath(cwd);
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8");
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
  return all.length ? all[all.length - 1]! : null;
}
