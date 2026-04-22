import path from "path";

/** Assumes `cwd` is the repo root (run npm scripts from project root). */
export function getAgenticRoot(cwd: string = process.cwd()): string {
  return path.join(cwd, "xalura-agentic");
}
