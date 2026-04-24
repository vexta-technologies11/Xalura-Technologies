import path from "path";
import { appendFileUtf8Agentic, readFileUtf8Agentic } from "./agenticDisk";
import { runChiefAI } from "../agents/chiefAI";
import type { DepartmentId } from "../engine/departments";
import { appendEvent } from "./eventQueue";
import { getAgenticRoot } from "./paths";
import { scheduleChiefDigestEmail } from "./phase7Alerts";

/**
 * After `audit-cycle-*.md` is written, append a live Chief AI assessment (uses Gemini when configured).
 */
export async function enrichAuditWithChief(params: {
  department: DepartmentId;
  auditFileRelative: string;
  cwd?: string;
  /** e.g. `seo:cloud-infrastructure` — separate vertical agent toward Chief */
  agentLaneKey?: string;
  agentLaneHumanLabel?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cwd = params.cwd ?? process.cwd();
  const abs = path.join(getAgenticRoot(cwd), params.auditFileRelative);
  let existing: string;
  try {
    const raw = readFileUtf8Agentic(abs);
    if (raw == null) throw new Error("missing audit file");
    existing = raw;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `read audit: ${msg}` };
  }
  const deptLabel =
    params.department === "seo"
      ? "SEO & Audit"
      : params.department.charAt(0).toUpperCase() + params.department.slice(1);
  const lanePreamble =
    params.agentLaneKey && params.agentLaneHumanLabel
      ? `This audit is for **one vertical agent lane** (${params.agentLaneHumanLabel}, key \`${params.agentLaneKey}\`) — an isolated Worker→Manager→Executive ladder, not the department-wide aggregate.\n\n`
      : params.agentLaneKey
        ? `This audit is for **one vertical agent lane** (\`${params.agentLaneKey}\`).\n\n`
        : "";
  try {
    const chiefMd = await runChiefAI({
      department: "All",
      task: `You are Chief AI for Xalura Tech. ${lanePreamble}Read this **${deptLabel}** department audit report (markdown below).

Respond in **markdown** with exactly these sections (use these headings):
## Chief score
A single number from 1–10 for this department window.
## Directive
One of: SCALE | OPTIMIZE | REVIEW | CHANGE_STRATEGY — then one short paragraph.
## Strategy note
What the Executive should change in the next 10-cycle window.

Audit report:
---
${existing.slice(0, 28_000)}`,
      context: { department: params.department, auditPath: params.auditFileRelative },
    });
    appendFileUtf8Agentic(
      abs,
      `\n\n---\n\n## Chief AI (live session)\n\n${chiefMd}\n`,
    );
    appendEvent(
      {
        type: "AUDIT_COMPLETE",
        payload: {
          department: params.department,
          audit_file: params.auditFileRelative.replace(/\\/g, "/"),
        },
      },
      cwd,
    );
    scheduleChiefDigestEmail({
      department: params.department,
      auditFileRelative: params.auditFileRelative.replace(/\\/g, "/"),
      cwdLabel: cwd,
      agentLaneKey: params.agentLaneKey,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appendFileUtf8Agentic(
      abs,
      `\n\n---\n\n## Chief AI (live session)\n\n_Chief enrichment failed: ${msg.replace(/\s+/g, " ").slice(0, 400)}_\n`,
    );
    return { ok: false, error: msg };
  }
}
