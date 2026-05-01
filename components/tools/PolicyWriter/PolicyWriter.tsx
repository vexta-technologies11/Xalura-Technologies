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
import { generatePolicy, type PolicyWriterResult } from "@/lib/services/policyWriterService";

const POLICY_TEMPLATES = [
  { value: "", label: "Standard policy" },
  { value: "hr", label: "HR Policy" },
  { value: "it-security", label: "IT Security" },
  { value: "code-of-conduct", label: "Code of Conduct" },
  { value: "data-privacy", label: "Data Privacy" },
  { value: "social-media", label: "Social Media" },
  { value: "travel", label: "Travel Policy" },
  { value: "overtime", label: "Overtime Policy" },
];

export function PolicyWriter() {
  const { usage, incrementUsage } = useUsageLimit("policy-writer");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [topic, setTopic] = useState("");
  const [template, setTemplate] = useState("");
  const [keyRules, setKeyRules] = useState<string[]>([""]);
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<PolicyWriterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRuleChange = (index: number, value: string) => {
    const updated = [...keyRules];
    updated[index] = value;
    if (value && index === updated.length - 1) updated.push("");
    setKeyRules(updated.filter((r, i) => r || i === updated.length - 1));
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) { openUpgrade("Policy Writer"); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generatePolicy({ topic, keyRules: keyRules.filter(Boolean), template: template || undefined, isPro: useProFeatures });
      setOutput(result);
      incrementUsage();
    } catch { setError("Something went wrong."); } finally { setIsGenerating(false); }
  }, [topic, keyRules, template, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => output ? `# ${output.title}\n\n${output.sections.map(s => `## ${s.heading}\n${s.content}`).join("\n\n")}` : "";

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Policies today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />
        <TextInput label="Policy Topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Remote Work Policy, Social Media Policy" />
        <SelectInput label="Template Type" options={POLICY_TEMPLATES} value={template} onChange={(e) => setTemplate(e.target.value)} />
        <div className="ai-tools__field"><label className="ai-tools__label">Key Rules / Guidelines</label>{keyRules.map((r, i) => (
          <input key={i} className="ai-tools__input" style={{ display: "block", width: "100%", marginBottom: 4, padding: "8px 10px" }} value={r} onChange={(e) => handleRuleChange(i, e.target.value)} placeholder={`Rule ${i + 1}`} />
        ))}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: useProFeatures ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${useProFeatures ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`, marginBottom: 12, cursor: "pointer" }} onClick={() => { if (usage.isBlocked) { openUpgrade("Pro features"); return; } setUseProFeatures(!useProFeatures); }}>
          <input type="checkbox" checked={useProFeatures} readOnly style={{ accentColor: "#c9a84c" }} />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}><strong>Enable Pro features</strong> — Version control, legal disclaimer, approval authority</div>
        </div>
        <div className="ai-tools__actions">
          <Button variant="primary" size="lg" isLoading={isGenerating} disabled={!topic || keyRules.filter(Boolean).length === 0 || isGenerating} onClick={handleGenerate}>
            {isGenerating ? "Generating..." : "Generate Policy"}
          </Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>
      <div className="ai-tools__out" style={{ maxWidth: 800, margin: "20px auto 0" }}>
        {isGenerating ? <OutputSkeleton /> : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">{output.title}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>v{output.version}</span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>{output.effectiveDate}</span>
              </div>
            </div>
            {output.sections.map((s, i) => (
              <div key={i} style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 4 }}>{s.heading}</div>
                <div style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "rgba(240,245,255,0.85)", whiteSpace: "pre-wrap" }}>{s.content}</div>
              </div>
            ))}
            {output.legalDisclaimer && <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", marginTop: 8, fontSize: "0.78rem", color: "rgba(239,68,68,0.7)" }}>{output.legalDisclaimer}</div>}
            <div style={{ height: 12 }} /><OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : <EmptyState icon="◇" title="Your policy will appear here" description="Enter policy details and click Generate Policy." />}
      </div>
      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
