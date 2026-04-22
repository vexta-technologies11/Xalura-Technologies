import { runAgent, type RunAgentParams } from "../lib/gemini";

export async function runManager(
  input: RunAgentParams,
): Promise<string> {
  return runAgent({ ...input, role: "Manager" });
}
