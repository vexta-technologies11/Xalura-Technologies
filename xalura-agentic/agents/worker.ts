import { runAgent, type RunAgentParams } from "../lib/gemini";

export async function runWorker(
  input: RunAgentParams,
): Promise<string> {
  return runAgent({ ...input, role: "Worker" });
}
