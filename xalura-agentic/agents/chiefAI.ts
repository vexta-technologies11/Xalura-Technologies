import { runAgent, type RunAgentParams } from "../lib/gemini";

export async function runChiefAI(
  input: Omit<RunAgentParams, "role">,
): Promise<string> {
  return runAgent({ ...input, role: "Chief AI", department: "All" });
}
