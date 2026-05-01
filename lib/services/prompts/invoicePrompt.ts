import type { BusinessLetterType, LetterContext } from "@/lib/services/invoiceService";

export function buildBusinessLetterPrompt(
  type: BusinessLetterType,
  context: LetterContext,
): string {
  return `You are a professional business correspondence writer. Generate a business letter.

LETTER TYPE: ${type} (quote | proposal | follow-up | thank-you | introduction | collection)
CLIENT NAME: ${context.clientName}
PROJECT NAME: ${context.projectName}
AMOUNT: ${context.amount ? `$${context.amount.toFixed(2)}` : "Not specified"}
DETAILS: ${context.details}

Return valid JSON only:
{
  "text": "string (complete letter ready to send)"
}

The letter should be professional, appropriately formatted with date, salutation, body, closing, and signature block. Do not include any markdown or extra text outside the JSON.}`;
}
