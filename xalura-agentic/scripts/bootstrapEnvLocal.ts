/**
 * Load project `.env.local` into `process.env` if the file exists, without overriding
 * existing vars. Local `tsx` does not read `.env.local` (unlike `next dev`); Cloudflare
 * secrets in the dashboard are not available to terminal scripts.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const p = join(process.cwd(), ".env.local");
if (existsSync(p)) {
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.replace(/\r$/, "").trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    if (process.env[k] !== undefined) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
      (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}
