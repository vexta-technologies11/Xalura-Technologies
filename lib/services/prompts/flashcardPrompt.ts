export interface FlashcardParams {
  text: string;
  count: number;
  format: "qa" | "fill-blank" | "multiple-choice";
}

export function buildFlashcardPrompt(params: FlashcardParams): string {
  const { text, count, format } = params;

  const formatInstructions = format === "qa"
    ? `Q&A format: Each card has a "term" (question or concept) and "definition" (answer or explanation).`
    : format === "fill-blank"
      ? `Fill-in-the-blank format: Each card has a sentence with "_____" where the answer goes, and the answer revealed separately.`
      : `Multiple choice format: Each card has a question, 4 options (A-D), the correct answer, and a brief explanation.`;

  return `You are a flashcard generator. Create ${count} flashcards from the following text.

TEXT:
${text.slice(0, 20000)}

FORMAT: ${format}
${formatInstructions}

Return valid JSON only:
{
  "deckName": "Auto-generated deck name based on content",
  "totalCards": ${count},
  "cards": [
    {
      "id": "fc-1",
      "term": "Question or concept",
      "definition": "Answer or explanation",
      ${format === "multiple-choice" ? `"options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "correctAnswer": "A",
      "explanation": "Why this is correct",` : ""}
      "category": "Topic category"
    }
  ],
  "categories": ["List of unique categories"],
  "difficulty": "beginner | intermediate | advanced"
}`;
}
