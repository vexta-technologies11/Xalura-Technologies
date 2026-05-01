import type { NoteTakerParams } from "./prompts/noteTakerPrompt";

export interface NoteTakerResult {
  cleanedNotes: string;
  keyTerms: { term: string; definition: string }[];
  wordCount: number;
  originalWordCount: number;
  reviewQuestions?: { question: string; answer: string }[];
  topics: string[];
  estimatedReadingTimeMinutes: number;
}

export async function cleanNotes(params: NoteTakerParams): Promise<NoteTakerResult> {
  const res = await fetch("/api/tools/note-taker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
