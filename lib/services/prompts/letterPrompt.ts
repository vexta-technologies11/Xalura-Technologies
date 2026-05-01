import type { LetterParams } from "@/lib/services/letterService";

export function buildLetterPrompt(params: LetterParams): string {
  return `You are a professional letter writer. Generate a letter in JSON.

CATEGORY: ${params.category}
SUB-TYPE: ${params.subType}
SENDER: ${params.senderName}
SENDER ADDRESS: ${params.senderAddress}
RECIPIENT: ${params.recipientTitle ? params.recipientTitle + " " : ""}${params.recipientName}
COMPANY: ${params.recipientCompany}
DATE: ${params.date}
SUBJECT: ${params.subject}
KEY POINTS: ${params.keyPoints.join(", ") || "None"}
TONE: ${params.tone}
LENGTH: ${params.length}
COMPLEXITY: ${params.complexity}

Return valid JSON only (no markdown, no preamble):
{
  "salutation": "string",
  "body": "string (complete letter body, properly paragraphed)",
  "closing": "string",
  "printedName": "string",
  "suggestedSubject": "string"
}`;
}
