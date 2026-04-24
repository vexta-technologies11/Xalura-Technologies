import path from "path";
import { getAgenticRoot } from "@/xalura-agentic/lib/paths";
import { readFileUtf8Agentic, writeFileUtf8Agentic } from "@/xalura-agentic/lib/agenticDisk";

const FILE = "chief-strategic-directives.json";

export type ChiefStrategicDirectivesV1 = {
  version: 1;
  text: string;
  updatedAt: string;
  setBy: string;
};

const EMPTY: ChiefStrategicDirectivesV1 = {
  version: 1,
  text: "",
  updatedAt: "",
  setBy: "",
};

function pathFor(cwd: string): string {
  return path.join(getAgenticRoot(cwd), "state", FILE);
}

export function readChiefStrategicDirectives(cwd: string): ChiefStrategicDirectivesV1 {
  const raw = readFileUtf8Agentic(pathFor(cwd));
  if (!raw?.trim()) return { ...EMPTY };
  try {
    const o = JSON.parse(raw) as ChiefStrategicDirectivesV1;
    if (o && o.version === 1 && typeof o.text === "string") {
      return o;
    }
  } catch {
    /* fall through */
  }
  return { ...EMPTY };
}

/**
 * Best-effort persist (no-op on read-only runtimes, e.g. some Workers without disk).
 * Callers should report success/failure in email.
 */
export function writeChiefStrategicDirectives(
  cwd: string,
  params: { text: string; setBy: string },
): { ok: true } | { ok: false; error: string } {
  const text = params.text.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { ok: false, error: "strategic text is empty" };
  }
  const out: ChiefStrategicDirectivesV1 = {
    version: 1,
    text: text.slice(0, 12_000),
    updatedAt: new Date().toISOString(),
    setBy: params.setBy.slice(0, 200),
  };
  try {
    const p = pathFor(cwd);
    writeFileUtf8Agentic(p, `${JSON.stringify(out, null, 2)}\n`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "write failed" };
  }
  const reread = readFileUtf8Agentic(pathFor(cwd));
  if (!reread) {
    return {
      ok: false,
      error: "strategic file was not written (this runtime has no agentic disk).",
    };
  }
  try {
    if (JSON.parse(reread).version !== 1) {
      return { ok: false, error: "strategic file verify failed after write" };
    }
  } catch {
    return { ok: false, error: "strategic file verify failed after write" };
  }
  return { ok: true };
}

export function formatChiefStrategicForSnapshot(cwd: string, max = 2_000): string {
  const o = readChiefStrategicDirectives(cwd);
  if (!o.text.trim()) {
    return "(no strategic brief set — use CHIEF_COMMAND set_strategic + approve in email, if enabled.)";
  }
  return [
    `last_updated: ${o.updatedAt || "unknown"}`,
    o.setBy ? `set_by: ${o.setBy}` : null,
    o.text.length > max ? `${o.text.slice(0, max)}…` : o.text,
  ]
    .filter((x): x is string => x != null)
    .join("\n");
}
