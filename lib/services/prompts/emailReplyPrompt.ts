export interface EmailReplyParams {
  emailContext: string;
  replyType: "accept" | "decline" | "request-info" | "thank" | "follow-up";
  tone: "professional" | "friendly" | "direct";
  customInstructions?: string;
  isPro: boolean;
}

export function buildEmailReplyPrompt(params: EmailReplyParams): string {
  const { emailContext, replyType, tone, customInstructions, isPro } = params;

  const typeDescriptions: Record<string, string> = {
    "accept": "Accept the offer, invitation, or request",
    "decline": "Politely decline the offer, invitation, or request",
    "request-info": "Request additional information or clarification",
    "thank": "Send a thank you message",
    "follow-up": "Follow up on a previous conversation",
  };

  return `You are an email reply assistant. Generate a professional email reply.

RECEIVED EMAIL CONTEXT:
${emailContext.slice(0, 10000)}

REPLY TYPE: ${replyType} — ${typeDescriptions[replyType]}
TONE: ${tone} (professional = formal business, friendly = warm but professional, direct = concise to-the-point)
${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ""}
${isPro ? "MODE: Pro (include subject line suggestion, multiple variants if possible)" : "MODE: Free (single reply)"}

Return valid JSON only:
{
  "subjectLine": "Auto-generated subject line (Re: ...)",
  "body": "Full email body text, properly formatted with paragraphs and line breaks",
  "salutation": "Dear [Name], or Hi [Name], depending on tone",
  "closing": "Best regards / Sincerely",
  "signatureName": "[Your Name]",
  ${isPro ? `"variants": [
    {"variant": 1, "body": "Alternative version...", "tone": "different approach"}
  ],` : ""}
  "suggestedActions": ["Action the sender might need to take"],
  "wordCount": 120
}`;
}
