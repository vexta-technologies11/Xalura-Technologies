export interface EssayOutlinerParams {
  topic: string;
  essayType: "argumentative" | "persuasive" | "expository" | "narrative" | "compare-contrast" | "cause-effect" | "problem-solution";
  thesis?: string;
  instructions?: string;
  researchNotes?: string;
  isPro: boolean;
}

export function buildEssayOutlinerPrompt(params: EssayOutlinerParams): string {
  const { topic, essayType, thesis, instructions, researchNotes, isPro } = params;

  return `You are an essay outlining assistant. Create a detailed essay outline.

TOPIC: "${topic}"
ESSAY TYPE: ${essayType}
${thesis ? `THESIS: "${thesis}"` : ""}
${instructions ? `SPECIAL INSTRUCTIONS: ${instructions}` : ""}
${researchNotes ? `RESEARCH NOTES: ${researchNotes}` : ""}
${isPro ? "MODE: Pro (include counter-arguments, evidence gaps, multiple structure options)" : "MODE: Free (standard outline)"}

Return valid JSON only:
{
  "thesis": "Clear thesis statement",
  "outline": [
    {
      "section": "I",
      "heading": "Introduction",
      "type": "introduction",
      "points": [
        "Hook sentence",
        "Background context",
        "Thesis statement"
      ],
      "estimatedParagraphs": 1,
      "evidenceNeeded": false
    },
    {
      "section": "II",
      "heading": "Main Point 1",
      "type": "body",
      "points": [
        "Topic sentence",
        "Supporting evidence point",
        "Analysis / explanation",
        "Link to thesis"
      ],
      "estimatedParagraphs": 2,
      "evidenceNeeded": true
    }
  ],
  ${isPro ? `"alternativeStructures": [
    {"type": "chronological", "description": "Organize by timeline..."},
    {"type": "problem-solution", "description": "Present problem first then solution..."}
  ],
  "counterArguments": [
    {"argument": "Possible counterpoint...", "rebuttal": "Your response..."}
  ],
  "evidenceGaps": [
    {"point": "Main Point 1", "suggestion": "Add a statistic or expert quote"}
  ],` : ""}
  "conclusion": {
    "restateThesis": "Restated thesis",
    "summaryPoints": ["Summarize key argument 1", "Summarize key argument 2"],
    "closingThought": "Powerful closing sentence or call to action"
  },
  "estimatedWords": 1500,
  "suggestedSources": ["Source type to look for"],
  "difficulty": "intermediate"
}`;
}
