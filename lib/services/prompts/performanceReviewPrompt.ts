export interface PerformanceReviewParams {
  employeeName: string;
  role: string;
  reviewType: "annual" | "quarterly" | "project";
  achievements: string[];
  growthAreas: string[];
  isPro: boolean;
}

export function buildPerformanceReviewPrompt(params: PerformanceReviewParams): string {
  const { employeeName, role, reviewType, achievements, growthAreas, isPro } = params;

  return `You are an HR assistant. Write a professional performance review.

EMPLOYEE: ${employeeName}
ROLE: ${role}
REVIEW TYPE: ${reviewType}
ACHIEVEMENTS: ${achievements.map((a, i) => `\n  ${i + 1}. ${a}`).join("")}
AREAS FOR GROWTH: ${growthAreas.map((g, i) => `\n  ${i + 1}. ${g}`).join("")}
${isPro ? "MODE: Pro (include SMART goals, company values alignment)" : "MODE: Free (standard review)"}

Return valid JSON only:
{
  "summary": "2-3 sentence overall performance summary",
  "strengths": [
    {"heading": "Strength area 1", "detail": "Specific example and impact"}
  ],
  "growthAreas": [
    {"area": "Area for improvement", "suggestion": "Actionable recommendation"}
  ],
  "overallRating": "Exceeds Expectations | Meets Expectations | Developing | Needs Improvement",
  ${isPro ? `"smartGoals": [
    {"goal": "Specific goal", "measurement": "How to measure", "achievable": "Why achievable", "relevant": "Why relevant", "timeframe": "By when"}
  ],
  "valuesAlignment": [
    {"value": "Company value", "demonstrated": "How employee demonstrated this"}
  ],` : ""}
  "recommendations": ["Recommendation for next period"],
  "reviewerNotes": "Any special notes or context"
}`;
}
