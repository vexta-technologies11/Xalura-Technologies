import type { SummaryOptions } from "@/lib/services/summarizerService";

export function buildSummarizerPrompt(text: string, options: SummaryOptions): string {
  const textPreview = text.slice(0, 25000);

  return `You are a document summarization assistant. Analyze the text and return a JSON object.

TEXT TO SUMMARIZE:
${textPreview}

LENGTH: ${options.length} (brief=10% of original, standard=20%, detailed=35%)
FORMAT: ${options.format} (bullets | paragraphs | qa | outline)
FOCUS: ${options.focus} (key-facts | action-items | conclusions | arguments | data-points)
AUDIENCE: ${options.audience} (general | expert | simple)

Return valid JSON only:
{
  "summary": "string (the main summary text)",
  "keyPoints": ["string", "string", ...] (5-10 key points),
  "takeaways": [
    {"id": "tw-1", "headline": "string", "detail": "string", "category": "string"}
  ],
  "qaItems": [
    {"id": "qa-1", "question": "string", "answer": "string"}
  ],
  "stats": {
    "originalWords": number,
    "summaryWords": number,
    "compressionRatio": number,
    "timeSavedMinutes": number,
    "sentiment": "positive" | "neutral" | "mixed" | "critical",
    "topicTags": ["string"],
    "complexityScore": "string"
  }
}`;
}
