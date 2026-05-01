export type SlideLayout = "title" | "content" | "two-column" | "quote" | "stats" | "agenda" | "close";
export type PresentationPurpose = "inform" | "persuade" | "teach" | "pitch" | "report";
export type PresentationAudience = "general" | "executives" | "technical" | "students" | "customers";
export type PresentationTone = "professional" | "academic" | "persuasive" | "casual" | "inspirational";

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  content: string[];
  notes: string;
}

export interface PresentationParams {
  topic: string;
  purpose: PresentationPurpose;
  audience: PresentationAudience;
  tone: PresentationTone;
  slideCount: number;
  customSections: string[];
}

export async function generatePresentation(params: PresentationParams): Promise<Slide[]> {
  // STUB — REPLACE IN PHASE 4 with: POST /api/tools/presentation-builder
  await new Promise((r) => setTimeout(r, 2000));

  const slides: Slide[] = [];
  const topic = params.topic || "Your Topic";

  // Title slide
  slides.push({
    id: "slide-0",
    layout: "title",
    title: topic,
    content: [`A presentation about ${topic}`, `Prepared for ${params.audience} audience`],
    notes: "Welcome everyone. Today I'll be discussing " + topic + ".",
  });

  // Agenda
  const sections = params.customSections.length > 0
    ? params.customSections
    : ["Introduction", "Background", "Key Findings", "Analysis", "Recommendations", "Next Steps"];

  slides.push({
    id: "slide-1",
    layout: "agenda",
    title: "Agenda",
    content: sections,
    notes: "Here's what we'll cover today.",
  });

  // Content slides
  for (let i = 0; i < Math.min(params.slideCount - 2, sections.length); i++) {
    const layouts: SlideLayout[] = ["content", "two-column", "content", "stats", "two-column", "content", "quote"];
    const layout = layouts[i % layouts.length];

    const slideContent: string[] = layout === "stats"
      ? [`85% improvement rate`, `3x faster delivery`, `50% cost reduction`]
      : [
          `Key point about ${sections[i] || "this topic"}`,
          `Supporting detail that reinforces the main message`,
          `Example or case study demonstrating the concept`,
        ];

    slides.push({
      id: `slide-${i + 2}`,
      layout,
      title: sections[i] || `Section ${i + 1}`,
      content: slideContent,
      notes: `Discuss ${sections[i] || "this section"} in detail. Key takeaway: the data supports our approach.`,
    });
  }

  // Quote slide
  slides.push({
    id: `slide-quote`,
    layout: "quote",
    title: `"The best way to predict the future is to create it."`,
    content: ["— Peter Drucker", "This quote encapsulates our approach to " + topic],
    notes: "This quote sets up our concluding remarks.",
  });

  // Closing slide
  slides.push({
    id: "slide-close",
    layout: "close",
    title: "Thank You",
    content: [
      "Questions & Discussion",
      "Contact: [Your Name]",
      "Email: your@email.com",
    ],
    notes: "Open the floor for questions. Thank attendees for their time.",
  });

  return slides;
}
