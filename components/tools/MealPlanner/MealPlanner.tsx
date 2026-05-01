"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { TextInput } from "@/components/shared/TextInput";
import { TextArea } from "@/components/shared/TextArea";
import { SelectInput } from "@/components/shared/SelectInput";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { generateMealPlan, type MealPlannerResult } from "@/lib/services/mealPlannerService";

const MEALS_OPTIONS = [
  { value: "2", label: "2 meals/day" },
  { value: "3", label: "3 meals/day" },
  { value: "4", label: "4 meals/day (with snacks)" },
  { value: "5", label: "5 meals/day (bodybuilder)" },
];

const DAYS_OPTIONS = [
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
];

export function MealPlanner() {
  const { usage, incrementUsage } = useUsageLimit("meal-planner");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("3");
  const [days, setDays] = useState("7");
  const [budget, setBudget] = useState("");
  const [useProFeatures, setUseProFeatures] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<MealPlannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) { openUpgrade("Meal Planner"); return; }
    setIsGenerating(true); setError(null);
    try {
      const result = await generateMealPlan({
        dietaryPreferences, restrictions: restrictions || undefined,
        mealsPerDay: parseInt(mealsPerDay), days: parseInt(days),
        budget: budget || undefined, isPro: useProFeatures,
      });
      setOutput(result); incrementUsage();
    } catch { setError("Something went wrong."); } finally { setIsGenerating(false); }
  }, [dietaryPreferences, restrictions, mealsPerDay, days, budget, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => output ? output.days.map(d => `${d.dayName}\n${d.meals.map(m => `${m.type}: ${m.dish}`).join("\n")}`).join("\n\n") : "";

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Plans today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />
        <TextInput label="Dietary Preferences" value={dietaryPreferences} onChange={(e) => setDietaryPreferences(e.target.value)} placeholder="e.g. Vegetarian, Keto, Mediterranean, High Protein" />
        <TextInput label="Restrictions/Allergies (optional)" value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="e.g. No dairy, gluten-free, nut allergy" />
        <div className="ai-tools__field-row ai-tools__field-row--3">
          <SelectInput label="Meals per day" options={MEALS_OPTIONS} value={mealsPerDay} onChange={(e) => setMealsPerDay(e.target.value)} />
          <SelectInput label="Days" options={DAYS_OPTIONS} value={days} onChange={(e) => setDays(e.target.value)} />
          <TextInput label="Weekly Budget (optional)" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. $75" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: useProFeatures ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${useProFeatures ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`, marginBottom: 12, cursor: "pointer" }} onClick={() => { if (usage.isBlocked) { openUpgrade("Pro"); return; } setUseProFeatures(!useProFeatures); }}>
          <input type="checkbox" checked={useProFeatures} readOnly style={{ accentColor: "#c9a84c" }} />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}><strong>Pro</strong> — Grocery list with quantities, prep-ahead schedule</div>
        </div>
        <div className="ai-tools__actions">
          <Button variant="primary" size="lg" isLoading={isGenerating} disabled={!dietaryPreferences || isGenerating} onClick={handleGenerate}>{isGenerating ? "Planning..." : "Create Meal Plan"}</Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>
      <div className="ai-tools__out" style={{ maxWidth: 800, margin: "20px auto 0" }}>
        {isGenerating ? <OutputSkeleton /> : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">{output.planName}</h3>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>{output.totalDays} days</span>
            </div>
            {output.days.map((d) => (
              <div key={d.day} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "rgba(240,245,255,0.9)" }}>{d.dayName}</span>
                  <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.5)" }}>{d.totalCalories} cal</span>
                </div>
                {d.meals.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "rgba(200,210,230,0.5)", textTransform: "uppercase" }}>{m.type}</span>
                      <span style={{ fontSize: "0.88rem", color: "rgba(240,245,255,0.85)", marginLeft: 8 }}>{m.dish}</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.5)" }}>{m.prepTime} min</span>
                  </div>
                ))}
              </div>
            ))}
            {output.groceryList && <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 8 }}>★ Grocery List (Pro)</div>
              {output.groceryList.map((g, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "0.85rem", color: "rgba(200,210,230,0.7)" }}>
                <span>{g.item}</span><span style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(200,210,230,0.5)" }}>{g.quantity}</span>
              </div>))}
            </div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{output.shoppingTips.map((t, i) => (<span key={i} style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.78rem", background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>🥦 {t}</span>))}</div>
            <div style={{ height: 12 }} /><OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : <EmptyState icon="◇" title="Your meal plan will appear here" description="Enter preferences and click Create Meal Plan." />}
      </div>
      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
