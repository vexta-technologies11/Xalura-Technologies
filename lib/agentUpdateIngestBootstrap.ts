import { isIngestBootstrapCompleteKv } from "@/lib/agentUpdatesStore";

/**
 * After the first approve/decline in KV, shared ingest requires Bearer (unless env overrides).
 */
export async function isAgentIngestSecurityActive(): Promise<boolean> {
  return isIngestBootstrapCompleteKv();
}
