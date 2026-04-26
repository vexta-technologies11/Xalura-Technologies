import path from "path";
import {
  fileExistsAgentic,
  readFileUtf8Agentic,
  writeFileUtf8Agentic,
} from "./agenticDisk";
import { getAgenticRoot } from "./paths";

const FILE = "operations-queue.json";

export type FailedOperation = {
  id: string;
  ts: string;
  kind: "gemini" | "pipeline" | "other";
  message: string;
  detail?: string;
};

type QueueFile = {
  version: 1;
  items: FailedOperation[];
};

function queuePath(cwd: string): string {
  return path.join(getAgenticRoot(cwd), "failed", FILE);
}

function load(cwd: string): QueueFile {
  const p = queuePath(cwd);
  if (!fileExistsAgentic(p)) {
    return { version: 1, items: [] };
  }
  try {
    const raw = readFileUtf8Agentic(p);
    if (raw == null) return { version: 1, items: [] };
    const parsed = JSON.parse(raw) as Partial<QueueFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return { version: 1, items: [] };
    }
    return { version: 1, items: parsed.items };
  } catch {
    return { version: 1, items: [] };
  }
}

function save(data: QueueFile, cwd: string): void {
  const p = queuePath(cwd);
  writeFileUtf8Agentic(p, JSON.stringify(data, null, 2));
}

export function appendFailedOperation(
  op: Omit<FailedOperation, "id" | "ts">,
  cwd: string = process.cwd(),
): FailedOperation {
  const data = load(cwd);
  const full: FailedOperation = {
    ...op,
    id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ts: new Date().toISOString(),
  };
  data.items.push(full);
  /** Keep last 200 entries */
  if (data.items.length > 200) {
    data.items = data.items.slice(-200);
  }
  save(data, cwd);
  setImmediate(() => {
    void import("./opsAlertSchedule")
      .then((m) => m.maybeSendOpsAlertDigest(cwd))
      .catch((e) => console.warn("[failedQueue] ops digest", e));
  });
  return full;
}

export function readFailedQueue(cwd: string = process.cwd()): FailedOperation[] {
  return load(cwd).items;
}

export function getFailedQueueCount(cwd: string = process.cwd()): number {
  return load(cwd).items.length;
}
