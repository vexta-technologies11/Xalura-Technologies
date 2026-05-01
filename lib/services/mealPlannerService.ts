import type { MealPlannerParams } from "./prompts/mealPlannerPrompt";

export interface MealPlannerResult {
  planName: string;
  totalDays: number;
  days: {
    day: number;
    dayName: string;
    meals: { type: string; dish: string; ingredients: string[]; prepTime: number; calories: number }[];
    totalCalories: number;
  }[];
  groceryList?: { item: string; quantity: string; category: string }[];
  prepSchedule?: { day: number; task: string; time: string }[];
  shoppingTips: string[];
}

export async function generateMealPlan(params: MealPlannerParams): Promise<MealPlannerResult> {
  const res = await fetch("/api/tools/meal-planner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
