import type { PerformanceReviewParams } from "./prompts/performanceReviewPrompt";

export interface PerformanceReviewResult {
  summary: string;
  strengths: { heading: string; detail: string }[];
  growthAreas: { area: string; suggestion: string }[];
  overallRating: string;
  smartGoals?: { goal: string; measurement: string; achievable: string; relevant: string; timeframe: string }[];
  valuesAlignment?: { value: string; demonstrated: string }[];
  recommendations: string[];
  reviewerNotes: string;
}

export async function generatePerformanceReview(params: PerformanceReviewParams): Promise<PerformanceReviewResult> {
  const res = await fetch("/api/tools/performance-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
