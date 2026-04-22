import { runAgent, type RunAgentParams } from "../lib/gemini";

export async function runExecutive(
  input: RunAgentParams,
): Promise<string> {
  return runAgent({ ...input, role: "Executive" });
}
