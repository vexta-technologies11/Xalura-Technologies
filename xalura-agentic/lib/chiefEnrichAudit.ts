import fs from "fs";
import path from "path";
import { runChiefAI } from "../agents/chiefAI";
import type { DepartmentId } from "../engine/departments";
import { appendEvent } from "./eventQueue";
import { getAgenticRoot } from "./paths";

/**
 * After `audit-cycle-*.md` is written, append a live Chief AI assessment (uses Gemini when configured).
 */
export async function enrichAuditWithChief(params: {
  department: DepartmentId;
  auditFileRelative: string;
  cwd?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cwd = params.cwd ?? process.cwd();
  const abs = path.join(getAgenticRoot(cwd), params.auditFileRelative);
  let existing: string;
  try {
    existing = fs.readFileSync(abs, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `read audit: ${msg}` };
  }
  const deptLabel =
    params.department === "seo"
      ? "SEO & Audit"
      : params.department.charAt(0).toUpperCase() + params.department.slice(1);
  try {
    const chiefMd = await runChiefAI({
      department: "All",
      task: `You are Chief AI for Xalura Tech. Read this **${deptLabel}** department audit report (markdown below).

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
    fs.appendFileSync(
      abs,
      `\n\n---\n\n## Chief AI (live session)\n\n${chiefMd}\n`,
      "utf8",
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
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fs.appendFileSync(
      abs,
      `\n\n---\n\n## Chief AI (live session)\n\n_Chief enrichment failed: ${msg.replace(/\s+/g, " ").slice(0, 400)}_\n`,
      "utf8",
    );
    return { ok: false, error: msg };
  }
}
