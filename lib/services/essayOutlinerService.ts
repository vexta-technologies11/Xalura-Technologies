import type { EssayOutlinerParams } from "./prompts/essayOutlinerPrompt";

export interface EssayOutlineResult {
  thesis: string;
  outline: {
    section: string;
    heading: string;
    type: string;
    points: string[];
    estimatedParagraphs: number;
    evidenceNeeded: boolean;
  }[];
  alternativeStructures?: {
    type: string;
    description: string;
  }[];
  counterArguments?: {
    argument: string;
    rebuttal: string;
  }[];
  evidenceGaps?: {
    point: string;
    suggestion: string;
  }[];
  conclusion: {
    restateThesis: string;
    summaryPoints: string[];
    closingThought: string;
  };
  estimatedWords: number;
  suggestedSources: string[];
  difficulty: string;
}

export async function generateEssayOutline(params: EssayOutlinerParams): Promise<EssayOutlineResult> {
  const res = await fetch("/api/tools/essay-outliner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
