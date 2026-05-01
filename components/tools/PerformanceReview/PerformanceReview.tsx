"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { SelectInput } from "@/components/shared/SelectInput";
import { TextInput } from "@/components/shared/TextInput";
import { TextArea } from "@/components/shared/TextArea";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { generatePerformanceReview, type PerformanceReviewResult } from "@/lib/services/performanceReviewService";

const REVIEW_TYPES = [
  { value: "annual", label: "Annual Review" },
  { value: "quarterly", label: "Quarterly Review" },
  { value: "project", label: "Project-based Review" },
];

export function PerformanceReview() {
  const { usage, incrementUsage } = useUsageLimit("performance-review");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [employeeName, setEmployeeName] = useState("");
  const [role, setRole] = useState("");
  const [reviewType, setReviewType] = useState("annual");
  const [achievements, setAchievements] = useState<string[]>([""]);
  const [growthAreas, setGrowthAreas] = useState<string[]>([""]);
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<PerformanceReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAchievementChange = (index: number, value: string) => {
    const updated = [...achievements];
    updated[index] = value;
    if (value && index === updated.length - 1) updated.push("");
    setAchievements(updated.filter((a, i) => a || i === updated.length - 1));
  };

  const handleGrowthChange = (index: number, value: string) => {
    const updated = [...growthAreas];
    updated[index] = value;
    if (value && index === updated.length - 1) updated.push("");
    setGrowthAreas(updated.filter((a, i) => a || i === updated.length - 1));
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) { openUpgrade("Performance Review Writer"); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generatePerformanceReview({
        employeeName, role, reviewType: reviewType as "annual" | "quarterly" | "project",
        achievements: achievements.filter(Boolean),
        growthAreas: growthAreas.filter(Boolean),
        isPro: useProFeatures,
      });
      setOutput(result);
      incrementUsage();
    } catch { setError("Something went wrong."); } finally { setIsGenerating(false); }
  }, [employeeName, role, reviewType, achievements, growthAreas, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => output ? `${output.summary}\n\nStrengths:\n${output.strengths.map(s => `• ${s.heading}: ${s.detail}`).join("\n")}\n\nGrowth Areas:\n${output.growthAreas.map(g => `• ${g.area}: ${g.suggestion}`).join("\n")}` : "";

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Reviews today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />
        <div className="ai-tools__field-row ai-tools__field-row--2">
          <TextInput label="Employee Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Jane Doe" />
          <TextInput label="Role / Title" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Software Engineer" />
        </div>
        <SelectInput label="Review Type" options={REVIEW_TYPES} value={reviewType} onChange={(e) => setReviewType(e.target.value)} />
        <div className="ai-tools__field">
          <label className="ai-tools__label">Achievements (1 per line)</label>
          {achievements.map((a, i) => (
            <input key={i} className="ai-tools__input" style={{ display: "block", width: "100%", marginBottom: 4, padding: "8px 10px" }} value={a} onChange={(e) => handleAchievementChange(i, e.target.value)} placeholder={`Achievement ${i + 1}`} />
          ))}
        </div>
        <div className="ai-tools__field">
          <label className="ai-tools__label">Areas for Growth (1 per line)</label>
          {growthAreas.map((g, i) => (
            <input key={i} className="ai-tools__input" style={{ display: "block", width: "100%", marginBottom: 4, padding: "8px 10px" }} value={g} onChange={(e) => handleGrowthChange(i, e.target.value)} placeholder={`Growth area ${i + 1}`} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: useProFeatures ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${useProFeatures ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`, marginBottom: 12, cursor: "pointer" }} onClick={() => { if (usage.isBlocked) { openUpgrade("Pro features"); return; } setUseProFeatures(!useProFeatures); }}>
          <input type="checkbox" checked={useProFeatures} readOnly style={{ accentColor: "#c9a84c" }} />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}><strong>Enable Pro features</strong> — SMART goals, company values alignment</div>
        </div>
        <div className="ai-tools__actions">
          <Button variant="primary" size="lg" isLoading={isGenerating} disabled={!employeeName || achievements.filter(Boolean).length === 0 || isGenerating} onClick={handleGenerate}>
            {isGenerating ? "Generating..." : "Generate Review"}
          </Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>
      <div className="ai-tools__out" style={{ maxWidth: 800, margin: "20px auto 0" }}>
        {isGenerating ? <OutputSkeleton /> : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">{employeeName} — {reviewType} Review</h3>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>{output.overallRating}</span>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16, lineHeight: 1.6, fontSize: "0.9rem", color: "rgba(240,245,255,0.85)" }}>{output.summary}</div>
            <div style={{ marginBottom: 12 }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(16,185,129,0.7)", marginBottom: 6 }}>Strengths</div>{output.strengths.map((s, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "rgba(240,245,255,0.9)", marginBottom: 2 }}>{s.heading}</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>{s.detail}</div>
              </div>
            ))}</div>
            <div style={{ marginBottom: 12 }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(245,158,11,0.7)", marginBottom: 6 }}>Growth Areas</div>{output.growthAreas.map((g, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "rgba(240,245,255,0.9)", marginBottom: 2 }}>{g.area}</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>{g.suggestion}</div>
              </div>
            ))}</div>
            {output.smartGoals && <div style={{ marginBottom: 12 }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 6 }}>★ SMART Goals (Pro)</div>{output.smartGoals.map((g, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "rgba(240,245,255,0.9)", marginBottom: 2 }}>{g.goal}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(200,210,230,0.6)" }}>Measure: {g.measurement} | By: {g.timeframe}</div>
              </div>
            ))}</div>}
            <div style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", marginBottom: 12 }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4 }}>Recommendations</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{output.recommendations.map((r, i) => <li key={i} style={{ padding: "2px 0", fontSize: "0.85rem", color: "rgba(200,210,230,0.7)", display: "flex", gap: 6 }}><span style={{ color: "#7c3aed" }}>•</span>{r}</li>)}</ul>
            </div>
            <div style={{ height: 12 }} /><OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : <EmptyState icon="◇" title="Your review will appear here" description="Enter employee details and click Generate Review." />}
      </div>
      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
