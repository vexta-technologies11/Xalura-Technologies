export interface PolicyWriterParams {
  topic: string;
  keyRules: string[];
  template?: string;
  isPro: boolean;
}

export function buildPolicyWriterPrompt(params: PolicyWriterParams): string {
  const { topic, keyRules, template, isPro } = params;

  return `You are a policy writer assistant. Draft a professional company policy.

POLICY TOPIC: "${topic}"
KEY RULES/POINTS: ${keyRules.map((r, i) => `\n  ${i + 1}. ${r}`).join("")}
${template ? `TEMPLATE TYPE: ${template}` : "Standard policy template"}
${isPro ? "MODE: Pro (include version control, effective date, legal disclaimer)" : "MODE: Free (standard policy draft)"}

Return valid JSON only:
{
  "title": "Policy Title",
  "effectiveDate": "Date",
  "version": "1.0",
  "sections": [
    {
      "heading": "Purpose",
      "content": "Why this policy exists"
    },
    {
      "heading": "Scope",
      "content": "Who this applies to"
    },
    {
      "heading": "Policy Statement",
      "content": "The main policy content with rules and guidelines"
    },
    {
      "heading": "Compliance",
      "content": "Consequences and enforcement"
    }
  ],
  ${isPro ? `"versionHistory": [
    {"version": "1.0", "date": "Date", "changes": "Initial draft"}
  ],
  "approvalAuthority": "Role or person who approves",
  "reviewDate": "When policy should be reviewed",
  "legalDisclaimer": "This is a draft template and does not constitute legal advice",` : ""}
  "relatedDocuments": ["Related policy names"]
}`;
}
