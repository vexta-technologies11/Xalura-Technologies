/**
 * Strict email block for production actions. Requires a line with only: approve
 * (case-insensitive) anywhere in the email body.
 *
 * ---CHIEF_COMMAND---
 * action: run_seo
 * use_topic_bank: true
 * content_vertical_id: sc-smb-automation
 * task: |
 *   Run one full SEO cycle with live Serp + crawls.
 * skip_phase7: false
 * ---END_CHIEF_COMMAND---
 * approve
 */

const BLOCK = /---\s*CHIEF_COMMAND\s*---\s*([\s\S]*?)\s*---\s*END_CHIEF_COMMAND\s*---/i;

const KNOWN = new Set([
  "action",
  "task",
  "use_topic_bank",
  "content_vertical_id",
  "skip_phase7",
  "publish_to_site",
  "strategic_text",
  "text",
  "keyword",
  "content_subcategory",
  "use_handoff",
  "force_topic_bank_refresh",
  "allow_stub_fallback",
  "reference_url",
]);

function lineHasOnlyApprove(line: string): boolean {
  return line.trim().toLowerCase() === "approve";
}

export function hasApproveLine(fullBody: string): boolean {
  for (const line of fullBody.split(/\r?\n/)) {
    if (lineHasOnlyApprove(line)) return true;
  }
  return false;
}

export function extractChiefCommandBlock(fullBody: string): string | null {
  const m = fullBody.match(BLOCK);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

type RecordMap = Record<string, string>;

function parseKeyValueBlock(block: string): { ok: true; map: RecordMap } | { ok: false; error: string } {
  const lines = block.split(/\r?\n/);
  const map: RecordMap = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const t = raw.trim();
    if (!t) {
      i += 1;
      continue;
    }
    const m = /^([a-z0-9_]+)\s*:\s*(.*)$/i.exec(t);
    if (!m) {
      return { ok: false, error: `Bad line (expected key: value): ${t.slice(0, 80)}` };
    }
    const key = m[1]!.toLowerCase();
    if (!KNOWN.has(key)) {
      return { ok: false, error: `Unknown key: ${key}` };
    }
    const firstVal = m[2] ?? "";
    if (firstVal.trim() === "|") {
      i += 1;
      const buf: string[] = [];
      while (i < lines.length) {
        const line = lines[i] ?? "";
        const n = line.trim();
        if (n) {
          const kMatch = /^\s*([a-z0-9_]+)\s*:\s*/.exec(n);
          if (kMatch && KNOWN.has(kMatch[1]!.toLowerCase()) && kMatch[1]!.toLowerCase() !== key) {
            break;
          }
        }
        buf.push(line);
        i += 1;
      }
      map[key] = buf.join("\n").replace(/\n+$/g, "\n").trim();
      continue;
    }
    map[key] = firstVal.trim();
    i += 1;
  }
  return { ok: true, map };
}

export type ChiefInboundAction =
  | {
      type: "run_seo";
      task: string;
      useTopicBank: boolean;
      contentVerticalId?: string;
      skipPhase7Fetch: boolean;
      keyword?: string;
      useHandoff: boolean;
      forceTopicBankRefresh: boolean;
      allowStubFallback: boolean;
    }
  | {
      type: "run_publishing";
      task: string;
      publishToSite: boolean;
      contentVerticalId?: string;
      contentSubcategory?: string;
      keyword?: string;
      useHandoff: boolean;
    }
  | { type: "run_marketing"; task: string; useHandoff: boolean; referenceUrl?: string }
  | { type: "set_strategic"; text: string };

export type ParseChiefCommandResult =
  | { kind: "none" }
  | { kind: "error"; error: string }
  | { kind: "need_approve"; action: ChiefInboundAction; description: string }
  | { kind: "ready"; action: ChiefInboundAction };

function asBool(s: string | undefined, d: boolean): boolean {
  if (s == null || s === "") return d;
  return s.toLowerCase() === "true" || s === "1" || s.toLowerCase() === "yes";
}

const VERT_ID = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;

function validateAction(map: RecordMap):
  | { ok: true; action: ChiefInboundAction }
  | { ok: false; error: string } {
  const a = (map["action"] ?? "").trim().toLowerCase();
  if (!a) {
    return { ok: false, error: "Missing action:" };
  }

  if (a === "set_strategic") {
    const text = (map["strategic_text"] || map["text"] || "").trim();
    if (!text) {
      return { ok: false, error: "set_strategic needs strategic_text: (or text:)" };
    }
    return { ok: true, action: { type: "set_strategic", text } };
  }

  const baseTask = (map["task"] ?? "").trim();
  if (!a.startsWith("set_") && !baseTask) {
    return { ok: false, error: "task: is required for this action" };
  }

  if (a === "run_seo") {
    const useTopicBank = asBool(map["use_topic_bank"], true);
    const cId = (map["content_vertical_id"] ?? "").trim() || undefined;
    if (useTopicBank) {
      if (!cId) {
        return {
          ok: false,
          error: "For run_seo with use_topic_bank: true, set content_vertical_id: (e.g. sc-… or tp-…).",
        };
      }
      if (!VERT_ID.test(cId) || cId.length > 120) {
        return { ok: false, error: `Invalid content_vertical_id: ${cId}` };
      }
    } else if (cId) {
      if (!VERT_ID.test(cId) || cId.length > 120) {
        return { ok: false, error: `Invalid content_vertical_id: ${cId}` };
      }
    }
    const useHandoff = asBool(map["use_handoff"], false);
    return {
      ok: true,
      action: {
        type: "run_seo",
        task: baseTask,
        useTopicBank,
        contentVerticalId: cId,
        /** `skip_phase7: true` in email → skip live Serp/Firecrawl for this run. */
        skipPhase7Fetch: asBool(map["skip_phase7"], false),
        keyword: (map["keyword"] ?? "").trim() || undefined,
        useHandoff,
        forceTopicBankRefresh: asBool(map["force_topic_bank_refresh"], false),
        allowStubFallback: asBool(map["allow_stub_fallback"], false),
      },
    };
  }

  if (a === "run_publishing") {
    return {
      ok: true,
      action: {
        type: "run_publishing",
        task: baseTask,
        publishToSite: asBool(map["publish_to_site"], false),
        contentVerticalId: (map["content_vertical_id"] ?? "").trim() || undefined,
        contentSubcategory: (map["content_subcategory"] ?? "").trim() || undefined,
        keyword: (map["keyword"] ?? "").trim() || undefined,
        useHandoff: asBool(map["use_handoff"], false),
      },
    };
  }

  if (a === "run_marketing") {
    const u = (map["reference_url"] ?? "").trim();
    return {
      ok: true,
      action: {
        type: "run_marketing",
        task: baseTask,
        useHandoff: asBool(map["use_handoff"], false),
        referenceUrl: u || undefined,
      },
    };
  }

  return {
    ok: false,
    error: `Unknown action: ${a}. Use run_seo | run_publishing | run_marketing | set_strategic`,
  };
}

export function parseChiefInboundCommand(fullBody: string): ParseChiefCommandResult {
  const inner = extractChiefCommandBlock(fullBody);
  if (inner == null) {
    return { kind: "none" };
  }

  const parsed = parseKeyValueBlock(inner);
  if (!parsed.ok) {
    return { kind: "error", error: parsed.error };
  }
  const act = validateAction(parsed.map);
  if (!act.ok) {
    return { kind: "error", error: act.error };
  }

  const desc = `action=${act.action.type}${
    act.action.type === "set_strategic"
      ? ""
      : ` task=${(act.action as { task: string }).task?.slice(0, 60) ?? ""}`
  }`;
  if (!hasApproveLine(fullBody)) {
    return { kind: "need_approve", action: act.action, description: desc };
  }
  return { kind: "ready", action: act.action };
}

/** Strip command block (and standalone `approve` lines) only when a block was present. */
export function stripChiefCommandForConversation(fullBody: string): string {
  if (!extractChiefCommandBlock(fullBody)) {
    return fullBody;
  }
  let t = fullBody.replace(BLOCK, "");
  t = t
    .split(/\r?\n/)
    .filter((l) => !lineHasOnlyApprove(l))
    .join("\n");
  return t.replace(/\n{3,}/g, "\n\n").trim() || "";
}
