import type { Metadata } from "next";
import Link from "next/link";
import { MealPlanner } from "@/components/tools/MealPlanner/MealPlanner";

export const metadata: Metadata = {
  title: "Meal Planner | Xalura Tech",
  description: "Create weekly meal plans with dietary preferences, restrictions, budget, and grocery lists.",
};

export default function MealPlannerPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">← All everyday tools</Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>🥗 Meal Planner</h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>Create weekly meal plans with dietary preferences, grocery lists (Pro), and prep-ahead schedules (Pro).</p>
      </div>
      <MealPlanner />
    </section>
  );
}
