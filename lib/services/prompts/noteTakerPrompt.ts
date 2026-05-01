export interface NoteTakerParams {
  rawNotes: string;
  mode: "cleanup" | "summary" | "study-guide";
  template?: "cornell" | "outline" | "concept";
  isPro: boolean;
}

export function buildNoteTakerPrompt(params: NoteTakerParams): string {
  const { rawNotes, mode, template, isPro } = params;

  const templateInstructions = template === "cornell"
    ? "Use Cornell method: left column for cues/questions, right column for notes, bottom for summary."
    : template === "outline"
      ? "Use outline method: hierarchical structure with Roman numerals, letters, and numbers."
      : "Use concept map text format: main concept → related concepts → details.";

  return `You are a note-taking assistant. Clean up and organize the following raw notes.

RAW NOTES:
${rawNotes.slice(0, 25000)}

MODE: ${mode}
${isPro ? `TEMPLATE: ${template || "outline"}\n${templateInstructions}` : "Standard cleanup mode"}

Return valid JSON only:
{
  "cleanedNotes": "The organized notes as a single string with proper formatting and line breaks",
  "keyTerms": [
    {"term": "Important term", "definition": "Brief definition"}
  ],
  "wordCount": 500,
  "originalWordCount": 1000,
  ${isPro && mode === "study-guide" ? `"reviewQuestions": [
    {"question": "Review question 1?", "answer": "Expected answer"}
  ],` : ""}
  "topics": ["Topic 1", "Topic 2"],
  "estimatedReadingTimeMinutes": 3
}`;
}
