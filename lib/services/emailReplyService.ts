import type { EmailReplyParams } from "./prompts/emailReplyPrompt";

export interface EmailReplyResult {
  subjectLine: string;
  body: string;
  salutation: string;
  closing: string;
  signatureName: string;
  variants?: { variant: number; body: string; tone: string }[];
  suggestedActions: string[];
  wordCount: number;
}

export async function generateEmailReply(params: EmailReplyParams): Promise<EmailReplyResult> {
  const res = await fetch("/api/tools/email-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
