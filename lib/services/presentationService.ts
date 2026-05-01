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
  const res = await fetch("/api/tools/presentation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
