import { buildMeetingAgendaPrompt } from "@/lib/services/prompts/meetingAgendaPrompt";
import { buildMeetingMinutesPrompt } from "@/lib/services/prompts/meetingMinutesPrompt";
import { buildEmailReplyPrompt } from "@/lib/services/prompts/emailReplyPrompt";
import { buildPerformanceReviewPrompt } from "@/lib/services/prompts/performanceReviewPrompt";
import { buildPolicyWriterPrompt } from "@/lib/services/prompts/policyWriterPrompt";
import { buildDataCleanupPrompt } from "@/lib/services/prompts/dataCleanupPrompt";
import { buildBudgetPlannerPrompt } from "@/lib/services/prompts/budgetPlannerPrompt";
import { buildMealPlannerPrompt } from "@/lib/services/prompts/mealPlannerPrompt";
import { buildFlashcardPrompt as buildNewFlashcardPrompt } from "@/lib/services/prompts/flashcardPrompt";
import { jsonError, jsonOk } from "@/lib/aiToolsPrompts";
import { buildLetterPrompt } from "@/lib/services/prompts/letterPrompt";
import { buildSummarizerPrompt } from "@/lib/services/prompts/summarizerPrompt";
import { buildCaptionPrompt } from "@/lib/services/prompts/captionPrompt";
import { buildTranslatePrompt } from "@/lib/services/prompts/translatorPrompt";
import { buildBusinessLetterPrompt } from "@/lib/services/prompts/invoicePrompt";
import {
  buildStudyGuidePrompt,
  buildFlashcardPrompt as buildStudyFlashcardPrompt,
  buildQuizPrompt,
} from "@/lib/services/prompts/studyPrompt";
import { buildPresentationPrompt } from "@/lib/services/prompts/presentationPrompt";
import {
  buildResumePrompt,
  buildEnhanceBulletPrompt,
  buildCoverLetterPrompt,
} from "@/lib/services/prompts/resumePrompt";
import { buildCitationPrompt } from "@/lib/services/prompts/citationPrompt";
import { buildEssayOutlinerPrompt } from "@/lib/services/prompts/essayOutlinerPrompt";
import { buildNoteTakerPrompt } from "@/lib/services/prompts/noteTakerPrompt";
import { runAiToolsGeminiJson, runAiToolsGemini } from "@/lib/aiToolsGemini";

interface Builders {
  json: Record<string, (args: any) => string>;
  text: Record<string, (args: any) => string>;
}

const BUILDERS: Builders = {
  json: {
    "letter-writer": (a) => buildLetterPrompt(a),
    summarizer: (a) => buildSummarizerPrompt(a.text, a),
    captions: (a) => buildCaptionPrompt(a, a.platforms),
    translator: (a) => buildTranslatePrompt(a.text, a.from, a.to, a),
    "business-letter": (a) => buildBusinessLetterPrompt(a.type, a),
    "study-guide": (a) => buildStudyGuidePrompt(a),
    flashcards: (a) => buildStudyFlashcardPrompt(a.text, a.count),
    quiz: (a) => buildQuizPrompt(a.text, a.count),
    presentation: (a) => buildPresentationPrompt(a),
    resume: (a) => buildResumePrompt(a),
    "cover-letter": (a) => buildCoverLetterPrompt(a),
    "citation-generator": (a) => buildCitationPrompt(a),
    "essay-outliner": (a) => buildEssayOutlinerPrompt(a),
    "flashcard-generator": (a) => buildNewFlashcardPrompt(a),
    "note-taker": (a) => buildNoteTakerPrompt(a),
    "meeting-agenda": (a) => buildMeetingAgendaPrompt(a),
    "meeting-minutes": (a) => buildMeetingMinutesPrompt(a),
    "email-reply": (a) => buildEmailReplyPrompt(a),
    "performance-review": (a) => buildPerformanceReviewPrompt(a),
    "policy-writer": (a) => buildPolicyWriterPrompt(a),
    "data-cleanup": (a) => buildDataCleanupPrompt(a),
    "budget-planner": (a) => buildBudgetPlannerPrompt(a),
    "meal-planner": (a) => buildMealPlannerPrompt(a),
  },
  text: {
    "enhance-bullet": (a) => buildEnhanceBulletPrompt(a.bullet, a.role),
  },
};

export async function POST(
  request: Request,
  { params }: { params: { toolId: string } },
) {
  const { toolId } = await params;

  try {
    const body = await request.json();
    const toolArgs = body.params || body;

    // Check JSON-mode builders first
    const jsonBuilder = BUILDERS.json[toolId];
    if (jsonBuilder) {
      const prompt = jsonBuilder(toolArgs);
      const result = await runAiToolsGeminiJson(prompt);
      if (!result.ok) {
        return jsonError(result.error, 500);
      }
      try {
        const data = JSON.parse(result.text);
        return jsonOk(JSON.stringify(data));
      } catch {
        return jsonError("Failed to parse AI response as JSON", 500);
      }
    }

    // Check text-mode builders
    const textBuilder = BUILDERS.text[toolId];
    if (textBuilder) {
      const prompt = textBuilder(toolArgs);
      const result = await runAiToolsGemini(prompt);
      if (!result.ok) {
        return jsonError(result.error, 500);
      }
      return jsonOk(JSON.stringify({ text: result.text }));
    }

    return jsonError(`Unknown tool: ${toolId}`, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return jsonError(msg, 500);
  }
}

