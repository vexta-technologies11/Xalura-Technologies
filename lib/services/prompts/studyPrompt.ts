import type { StudyParams } from "@/lib/services/studyService";

export function buildStudyGuidePrompt(params: StudyParams): string {
  return `You are an educational study guide creator. Generate a comprehensive study guide.

SOURCE TYPE: ${params.sourceType} (lecture-notes | textbook | article | meeting-notes)
COMPLEXITY: ${params.complexity} (high-school | college | graduate | expert)

TEXT TO STUDY:
${params.text.slice(0, 25000)}

Return valid JSON only:
{
  "overview": "string (brief overview of the material)",
  "concepts": [
    {"heading": "string", "explanation": "string"}
  ],
  "keyTerms": [
    {"term": "string", "definition": "string"}
  ],
  "studyTips": ["string", "string"]
}`;
}

export function buildFlashcardPrompt(text: string, count: number): string {
  return `Based on the following text, generate ${count} flashcards.

TEXT:
${text.slice(0, 25000)}

Return valid JSON only:
{
  "flashcards": [
    {"id": "fc-0", "front": "string (question)", "back": "string (answer)", "known": false}
  ]
}`;
}

export function buildQuizPrompt(text: string, count: number): string {
  return `Based on the following text, generate ${count} quiz questions mixing multiple-choice, true-false, and fill-in-the-blank.

TEXT:
${text.slice(0, 25000)}

Return valid JSON only:
{
  "questions": [
    {
      "id": "q-1",
      "type": "multiple-choice" | "true-false" | "fill-blank",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string (must match one of the options)",
      "explanation": "string"
    }
  ]
}`;
}
