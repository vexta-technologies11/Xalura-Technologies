import type { Metadata } from "next";
import Link from "next/link";
import { BudgetPlanner } from "@/components/tools/BudgetPlanner/BudgetPlanner";

export const metadata: Metadata = {
  title: "Budget Planner | Xalura Tech",
  description: "Create a personal budget plan with income and expense breakdowns, savings goals, and debt strategies.",
};

export default function BudgetPlannerPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">← All everyday tools</Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>💰 Budget Planner</h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>Create a budget with income/expense breakdown, savings rate, and Pro debt payoff strategies.</p>
      </div>
      <BudgetPlanner />
    </section>
  );
}
