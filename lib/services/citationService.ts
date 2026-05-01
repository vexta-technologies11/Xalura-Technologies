import type { CitationParams } from "./prompts/citationPrompt";

export interface CitationResult {
  citations: {
    id: string;
    formatted: string;
    style: string;
    sourceType: string;
    inText: string;
    bibliographyNote?: string;
  }[];
}

export async function generateCitation(params: CitationParams): Promise<CitationResult> {
  const res = await fetch("/api/tools/citation-generator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
