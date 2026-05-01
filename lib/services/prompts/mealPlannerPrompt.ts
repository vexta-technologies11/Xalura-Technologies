export interface MealPlannerParams {
  dietaryPreferences: string;
  restrictions?: string;
  mealsPerDay: number;
  days: number;
  budget?: string;
  isPro: boolean;
}

export function buildMealPlannerPrompt(params: MealPlannerParams): string {
  const { dietaryPreferences, restrictions, mealsPerDay, days, budget, isPro } = params;

  return `You are a meal planning assistant. Create a meal plan.

DIETARY PREFERENCES: ${dietaryPreferences}
${restrictions ? `RESTRICTIONS: ${restrictions}` : ""}
MEALS PER DAY: ${mealsPerDay}
DAYS: ${days}
${budget ? `WEEKLY BUDGET: ${budget}` : ""}
${isPro ? "MODE: Pro (include grocery list with quantities, prep-ahead schedule, nutrition info)" : "MODE: Free (meal plan only)"}

Return valid JSON only:
{
  "planName": "Auto-generated plan name",
  "totalDays": ${days},
  "days": [
    {
      "day": 1,
      "dayName": "Monday",
      "meals": [
        {"type": "Breakfast", "dish": "Meal name", "ingredients": ["Ingredient 1", "Ingredient 2"], "prepTime": 15, "calories": 400}
      ],
      "totalCalories": 2000
    }
  ],
  ${isPro ? `"groceryList": [
    {"item": "Ingredient", "quantity": "Amount", "category": "Produce | Dairy | Meat | Pantry"}
  ],
  "prepSchedule": [
    {"day": 1, "task": "Chop vegetables", "time": "30 min"}
  ],` : ""}
  "shoppingTips": ["Buy in bulk", "Seasonal produce suggestion"]
}`;
}
