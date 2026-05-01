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
  // STUB — REPLACE IN PHASE 4 with: POST /api/tools/letter-writer
  await new Promise((r) => setTimeout(r, 1500));

  const toneIntro: Record<string, string> = {
    polite: "I hope this message finds you well.",
    firm: "I am writing to address a matter that requires your immediate attention.",
    formal: "I am writing to formally address the following matter.",
    friendly: "I hope you're doing great! I wanted to reach out about something.",
    urgent: "I am writing to bring an urgent matter to your attention.",
  };

  const lengthMultiplier: Record<string, number> = {
    brief: 1,
    standard: 2,
    detailed: 4,
  };

  const paragraphs = lengthMultiplier[params.length];
  const bodyParts: string[] = [];

  bodyParts.push(toneIntro[params.tone] || toneIntro.polite);

  if (params.keyPoints.length > 0) {
    bodyParts.push(`I would like to discuss the following: ${params.keyPoints.join(", ")}.`);
  }

  for (let i = 0; i < paragraphs - 1; i++) {
    bodyParts.push(
      `Furthermore, I believe it is important to address this matter thoroughly and ensure that all parties involved are on the same page. I am confident that we can find a satisfactory resolution.`,
    );
  }

  bodyParts.push(
    `Thank you for taking the time to consider this matter. I look forward to your response and hope we can move forward constructively.`,
  );

  return {
    salutation: `Dear ${params.recipientTitle ? params.recipientTitle + " " : ""}${params.recipientName || "Sir or Madam"},`,
    body: bodyParts.join("\n\n"),
    closing: "Sincerely",
    printedName: params.senderName || "Your Name",
    suggestedSubject: params.subject || `Regarding: ${params.category}`,
  };
}
