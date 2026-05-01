"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { TextArea } from "@/components/shared/TextArea";
import { TextInput } from "@/components/shared/TextInput";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { generateBudgetPlan, type BudgetPlannerResult } from "@/lib/services/budgetPlannerService";

export function BudgetPlanner() {
  const { usage, incrementUsage } = useUsageLimit("budget-planner");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [goals, setGoals] = useState("");
  const [useProFeatures, setUseProFeatures] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<BudgetPlannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) { openUpgrade("Budget Planner"); return; }
    setIsGenerating(true); setError(null);
    try {
      const result = await generateBudgetPlan({ income, expenses, goals: goals || undefined, isPro: useProFeatures });
      setOutput(result); incrementUsage();
    } catch { setError("Something went wrong."); } finally { setIsGenerating(false); }
  }, [income, expenses, goals, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => output ? `Budget: ${output.budgetName}\nIncome: $${output.incomeTotal}\nExpenses: $${output.expenseTotal}\nNet: $${output.netSavings}` : "";

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Plans today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />
        <TextInput label="Income (monthly)" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g. $5,000 salary + $500 freelance" />
        <TextArea label="Expenses (list them)" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="e.g. Rent $1,500, Groceries $400, Subscriptions $50..." rows={5} />
        <TextArea label="Financial Goals (optional)" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Save $10,000 for down payment, pay off $5,000 credit card" rows={2} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: useProFeatures ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${useProFeatures ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`, marginBottom: 12, cursor: "pointer" }} onClick={() => { if (usage.isBlocked) { openUpgrade("Pro"); return; } setUseProFeatures(!useProFeatures); }}>
          <input type="checkbox" checked={useProFeatures} readOnly style={{ accentColor: "#c9a84c" }} />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}><strong>Pro</strong> — Debt strategy, savings projection</div>
        </div>
        <div className="ai-tools__actions">
          <Button variant="primary" size="lg" isLoading={isGenerating} disabled={!income || !expenses || isGenerating} onClick={handleGenerate}>{isGenerating ? "Planning..." : "Create Budget"}</Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>
      <div className="ai-tools__out" style={{ maxWidth: 800, margin: "20px auto 0" }}>
        {isGenerating ? <OutputSkeleton /> : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">{output.budgetName}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>${output.incomeTotal} income</span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>${output.expenseTotal} expenses</span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>${output.netSavings} savings ({output.savingsRate}%)</span>
              </div>
            </div>
            {output.categories.map((c, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 6, background: "rgba(0,0,0,0.12)", marginBottom: 4, borderLeft: `3px solid ${c.type === "needs" ? "#ef4444" : c.type === "wants" ? "#f59e0b" : "#34d399"}` }}>
              <span style={{ fontSize: "0.88rem", color: "rgba(240,245,255,0.9)" }}>{c.name}</span>
              <span style={{ fontSize: "0.88rem", fontFamily: "'JetBrains Mono', monospace", color: "rgba(200,210,230,0.7)" }}>${c.amount} ({c.percentage}%)</span>
            </div>))}
            <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", marginTop: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "rgba(240,245,255,0.85)", lineHeight: 1.5 }}>{output.recommendation}</div>
            </div>
            {output.debtStrategy && <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", marginTop: 8 }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 4 }}>★ Debt Strategy (Pro)</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.7)" }}>{output.debtStrategy.strategy} — ${output.debtStrategy.monthlyPayment}/mo for {output.debtStrategy.monthsToPayoff} months</div>
            </div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{output.tips.map((t, i) => (<span key={i} style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.78rem", background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>💡 {t}</span>))}</div>
            <div style={{ height: 12 }} /><OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : <EmptyState icon="◇" title="Your budget plan will appear here" description="Enter income and expenses, then click Create Budget." />}
      </div>
      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
