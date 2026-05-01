export type SourceType = "lecture-notes" | "textbook" | "article" | "meeting-notes";
export type ComplexityLevel = "high-school" | "college" | "graduate" | "expert";

export interface StudyGuideOutput {
  overview: string;
  concepts: { heading: string; explanation: string }[];
  keyTerms: { term: string; definition: string }[];
  studyTips: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  known: boolean;
}

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface StudyParams {
  text: string;
  sourceType: SourceType;
  complexity: ComplexityLevel;
}

export async function generateStudyGuide(params: StudyParams): Promise<StudyGuideOutput> {
  const res = await fetch("/api/tools/study-guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}

export async function generateFlashcards(text: string, count: number): Promise<Flashcard[]> {
  const res = await fetch("/api/tools/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { text, count } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  const parsed = JSON.parse(json.text);
  return parsed.flashcards || parsed;
}

export async function generateQuiz(text: string, questionCount: number): Promise<QuizQuestion[]> {
  const res = await fetch("/api/tools/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { text, count: questionCount } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  const parsed = JSON.parse(json.text);
  return parsed.questions || parsed;
}
