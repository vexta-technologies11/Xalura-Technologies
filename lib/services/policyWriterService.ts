import type { PolicyWriterParams } from "./prompts/policyWriterPrompt";

export interface PolicyWriterResult {
  title: string;
  effectiveDate: string;
  version: string;
  sections: { heading: string; content: string }[];
  versionHistory?: { version: string; date: string; changes: string }[];
  approvalAuthority?: string;
  reviewDate?: string;
  legalDisclaimer?: string;
  relatedDocuments: string[];
}

export async function generatePolicy(params: PolicyWriterParams): Promise<PolicyWriterResult> {
  const res = await fetch("/api/tools/policy-writer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
