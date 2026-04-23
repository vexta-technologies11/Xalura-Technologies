import fs from "fs";
import path from "path";
import type { DepartmentId } from "../engine/departments";
import { getAgenticRoot } from "./paths";

export type AgentNamesConfig = {
  note?: string;
  departments: Record<
    DepartmentId,
    { worker: { name: string }; manager: { name: string }; executive: { name: string } }
  >;
  chiefAI: { name: string };
};

const DEFAULT: AgentNamesConfig = {
  departments: {
    marketing: { worker: { name: "" }, manager: { name: "" }, executive: { name: "" } },
    publishing: { worker: { name: "" }, manager: { name: "" }, executive: { name: "" } },
    seo: { worker: { name: "" }, manager: { name: "" }, executive: { name: "" } },
  },
  chiefAI: { name: "" },
};

export function loadAgentNamesConfig(cwd: string = process.cwd()): AgentNamesConfig {
  const p = path.join(getAgenticRoot(cwd), "config", "agents.json");
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as AgentNamesConfig;
    if (!parsed?.departments || !parsed.chiefAI) return DEFAULT;
    return parsed;
  } catch {
    return DEFAULT;
  }
}

/** Executive display name for audit markdown; falls back to "(unnamed)". */
export function executiveDisplayName(
  dept: DepartmentId,
  cwd: string = process.cwd(),
): string {
  const n = loadAgentNamesConfig(cwd).departments[dept]?.executive?.name?.trim();
  return n || "(unnamed)";
}
