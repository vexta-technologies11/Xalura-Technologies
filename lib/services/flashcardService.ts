import type { FlashcardParams } from "./prompts/flashcardPrompt";

export interface FlashcardResult {
  deckName: string;
  totalCards: number;
  cards: {
    id: string;
    term: string;
    definition: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    category: string;
  }[];
  categories: string[];
  difficulty: string;
}

export async function generateFlashcards(params: FlashcardParams): Promise<FlashcardResult> {
  const res = await fetch("/api/tools/flashcard-generator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
