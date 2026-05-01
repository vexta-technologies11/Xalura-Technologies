export interface SummaryOptions {
  length: "brief" | "standard" | "detailed";
  format: "bullets" | "paragraphs" | "qa" | "outline";
  focus: "key-facts" | "action-items" | "conclusions" | "arguments" | "data-points";
  audience: "general" | "expert" | "simple";
}

export interface SummaryOutput {
  summary: string;
  keyPoints: string[];
  takeaways: { id: string; headline: string; detail: string; category: string }[];
  qaItems: { id: string; question: string; answer: string }[];
  stats: {
    originalWords: number;
    summaryWords: number;
    compressionRatio: number;
    timeSavedMinutes: number;
    sentiment: "positive" | "neutral" | "mixed" | "critical";
    topicTags: string[];
    complexityScore: string;
  };
}

export async function summarizeDocument(
  text: string,
  options: SummaryOptions,
): Promise<SummaryOutput> {
  const res = await fetch("/api/tools/summarizer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { text, ...options } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
