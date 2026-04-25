import { resolveWorkerEnv } from "@/xalura-agentic/lib/resolveWorkerEnv";

function trimBom(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/^\uFEFF/g, "").trim();
}

/**
 * Inbound route env: `process.env` + Worker bindings; strips BOM; works when only one path is set (e.g. Vercel).
 */
export async function readInboundRouteEnv(name: string): Promise<string> {
  const a = await resolveWorkerEnv(name);
  const b = typeof process !== "undefined" ? process.env[name] : undefined;
  return trimBom((a || b) ?? "");
}

export async function readHeadOfNewsInboundTo(): Promise<string> {
  const a = await readInboundRouteEnv("HEAD_OF_NEWS_INBOUND_TO");
  if (a) return a;
  return readInboundRouteEnv("NEWS_HEAD_INBOUND_TO");
}
