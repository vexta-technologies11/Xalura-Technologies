import { fetchAgentNamesFromSupabase } from "@/lib/agenticAgentNamesSupabase";
import {
  loadAgentNamesConfig,
  materializeAgentNames,
  type AgentNamesConfig,
} from "@/xalura-agentic/lib/agentNames";

/**
 * Resolves `config/agents.json` plus optional Supabase row (`agentic_agent_names`).
 * **Supabase wins** when a valid row exists (required for read-only edge filesystems).
 */
export async function loadAgentNamesResolved(cwd: string = process.cwd()): Promise<AgentNamesConfig> {
  const fromFile = loadAgentNamesConfig(cwd);
  const fromDb = await fetchAgentNamesFromSupabase();
  if (fromDb) {
    return materializeAgentNames(fromDb);
  }
  return fromFile;
}
