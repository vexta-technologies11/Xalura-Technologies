export interface LetterParams {
  category: string;
  subType: string;
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientTitle: string;
  recipientCompany: string;
  date: string;
  subject: string;
  keyPoints: string[];
  tone: "polite" | "firm" | "formal" | "friendly" | "urgent";
  length: "brief" | "standard" | "detailed";
  complexity: "simple" | "standard" | "professional";
}

export interface LetterOutput {
  salutation: string;
  body: string;
  closing: string;
  printedName: string;
  suggestedSubject: string;
}

export async function generateLetter(params: LetterParams): Promise<LetterOutput> {
  const res = await fetch("/api/tools/letter-writer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}

