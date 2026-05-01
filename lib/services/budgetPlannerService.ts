import type { BudgetPlannerParams } from "./prompts/budgetPlannerPrompt";

export interface BudgetPlannerResult {
  budgetName: string;
  incomeTotal: number;
  expenseTotal: number;
  netSavings: number;
  savingsRate: number;
  categories: { name: string; amount: number; percentage: number; type: string }[];
  recommendation: string;
  debtStrategy?: { totalDebt: number; monthsToPayoff: number; strategy: string; monthlyPayment: number };
  savingsProjection?: { sixMonthFund: number; monthsToBuild: number; monthlySavingsTarget: number };
  tips: string[];
}

export async function generateBudgetPlan(params: BudgetPlannerParams): Promise<BudgetPlannerResult> {
  const res = await fetch("/api/tools/budget-planner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
