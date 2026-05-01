export interface BudgetPlannerParams {
  income: string;
  expenses: string;
  goals?: string;
  isPro: boolean;
}

export function buildBudgetPlannerPrompt(params: BudgetPlannerParams): string {
  const { income, expenses, goals, isPro } = params;

  return `You are a personal finance assistant. Create a budget plan.

MONTHLY INCOME: ${income}
EXPENSES: ${expenses}
${goals ? `FINANCIAL GOALS: ${goals}` : ""}
${isPro ? "MODE: Pro (include debt payoff strategy, savings projection, investment recommendations)" : "MODE: Free (basic budget breakdown)"}

Return valid JSON only:
{
  "budgetName": "Auto-generated budget name",
  "incomeTotal": 5000,
  "expenseTotal": 3500,
  "netSavings": 1500,
  "savingsRate": 30,
  "categories": [
    {"name": "Housing", "amount": 1500, "percentage": 30, "type": "needs | wants | savings"}
  ],
  "recommendation": "Overall recommendation",
  ${isPro ? `"debtStrategy": {
    "totalDebt": 15000,
    "monthsToPayoff": 10,
    "strategy": "Snowball or avalanche method recommendation",
    "monthlyPayment": 1500
  },
  "savingsProjection": {
    "sixMonthFund": 15000,
    "monthsToBuild": 8,
    "monthlySavingsTarget": 1875
  },` : ""}
  "tips": ["Money saving tip 1", "Tip 2"]
}`;
}
