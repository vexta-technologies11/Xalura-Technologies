import fs from "fs";
import path from "path";

let diskWritableCache: boolean | null = null;

/**
 * Cloudflare Workers (unenv) throw for mkdirSync/writeFileSync; local Node has real fs.
 */
export function isAgenticDiskWritable(): boolean {
  if (diskWritableCache !== null) return diskWritableCache;
  const probe = path.join(process.cwd(), ".__agentic_disk_probe__");
  try {
    fs.mkdirSync(probe, { recursive: true });
    try {
      fs.writeFileSync(path.join(probe, "t.txt"), "ok", "utf8");
    } finally {
      try {
        fs.rmSync(probe, { recursive: true, force: true });
      } catch {
        /* rmSync may be unimplemented */
      }
    }
    diskWritableCache = true;
    return true;
  } catch {
    diskWritableCache = false;
    return false;
  }
}

export function mkdirRecursiveAgentic(dir: string): void {
  if (!isAgenticDiskWritable()) return;
  fs.mkdirSync(dir, { recursive: true });
}

export function writeFileUtf8Agentic(filePath: string, body: string): void {
  if (!isAgenticDiskWritable()) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body, "utf8");
}

export function appendFileUtf8Agentic(filePath: string, body: string): void {
  if (!isAgenticDiskWritable()) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, body, "utf8");
}

export function fileExistsAgentic(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export function readFileUtf8Agentic(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}
