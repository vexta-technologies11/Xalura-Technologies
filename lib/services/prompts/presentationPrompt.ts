import type { PresentationParams } from "@/lib/services/presentationService";

export function buildPresentationPrompt(params: PresentationParams): string {
  const sections = params.customSections.length > 0
    ? params.customSections.join(", ")
    : "Introduction, Background, Key Findings, Analysis, Recommendations, Next Steps";

  return `You are a presentation content creator. Generate a slide deck.

TOPIC: ${params.topic}
PURPOSE: ${params.purpose} (inform | persuade | teach | pitch | report)
AUDIENCE: ${params.audience} (general | executives | technical | students | customers)
TONE: ${params.tone} (professional | academic | persuasive | casual | inspirational)
SLIDE COUNT: ${params.slideCount} (minimum 3 slides)
SECTIONS: ${sections}

Layout types available: title, content, two-column, quote, stats, agenda, close

Return valid JSON only (an array of slides):
[
  {
    "id": "slide-0",
    "layout": "title",
    "title": "string",
    "content": ["string", "string"],
    "notes": "string (speaker notes)"
  }
]

Rules:
- First slide must be layout "title"
- Include an "agenda" slide early on
- Include a "quote" slide near the end
- Last slide must be layout "close"
- Stats layout should have data-driven bullet points
- Two-column layout should have exactly 2 content items
- Speaker notes should be helpful for the presenter`;
}
