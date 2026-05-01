"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { SelectInput } from "@/components/shared/SelectInput";
import { TextArea } from "@/components/shared/TextArea";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { cleanupData, type DataCleanupResult } from "@/lib/services/dataCleanupService";

const CLEANUP_TYPES = [
  { value: "deduplicate", label: "Deduplicate" },
  { value: "standardize", label: "Standardize format" },
  { value: "extract", label: "Extract (emails, phones, etc.)" },
  { value: "csv-clean", label: "CSV/TSV cleanup" },
  { value: "custom", label: "Custom rules" },
];

const EXTRACT_PATTERNS = [
  { value: "emails", label: "Email addresses" },
  { value: "phones", label: "Phone numbers" },
  { value: "dates", label: "Dates" },
  { value: "urls", label: "URLs" },
  { value: "invoice-numbers", label: "Invoice numbers" },
];

export function DataCleanup() {
  const { usage, incrementUsage } = useUsageLimit("data-cleanup");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [rawData, setRawData] = useState("");
  const [cleanupType, setCleanupType] = useState("deduplicate");
  const [extractPattern, setExtractPattern] = useState("emails");
  const [customRules, setCustomRules] = useState("");
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<DataCleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) { openUpgrade("Data Cleanup Tool"); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await cleanupData({ rawData, cleanupType, extractPattern: cleanupType === "extract" ? extractPattern : undefined, customRules: cleanupType === "custom" ? customRules : undefined, isPro: useProFeatures });
      setOutput(result);
      incrementUsage();
    } catch { setError("Something went wrong."); } finally { setIsGenerating(false); }
  }, [rawData, cleanupType, extractPattern, customRules, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => output?.cleanedData || "";

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Cleanups today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />
        <TextArea label="Paste your data" value={rawData} onChange={(e) => setRawData(e.target.value)} placeholder="Paste names, emails, phone numbers, or CSV data..." rows={8} hint={`${rawData.split("\n").length} lines`} />
        <div className="ai-tools__field-row ai-tools__field-row--2">
          <SelectInput label="Cleanup Type" options={CLEANUP_TYPES} value={cleanupType} onChange={(e) => setCleanupType(e.target.value)} />
          {cleanupType === "extract" && <SelectInput label="Extract Pattern" options={EXTRACT_PATTERNS} value={extractPattern} onChange={(e) => setExtractPattern(e.target.value)} />}
        </div>
        {cleanupType === "custom" && <TextArea label="Custom Rules" value={customRules} onChange={(e) => setCustomRules(e.target.value)} placeholder="e.g. Merge first & last name columns, format phones as +1 (555) 123-4567" rows={2} />}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: useProFeatures ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${useProFeatures ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`, marginBottom: 12, cursor: "pointer" }} onClick={() => { if (usage.isBlocked) { openUpgrade("Pro features"); return; } setUseProFeatures(!useProFeatures); }}>
          <input type="checkbox" checked={useProFeatures} readOnly style={{ accentColor: "#c9a84c" }} />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}><strong>Enable Pro features</strong> — Validation report, CSV export</div>
        </div>
        <div className="ai-tools__actions">
          <Button variant="primary" size="lg" isLoading={isGenerating} disabled={rawData.length < 5 || isGenerating} onClick={handleGenerate}>
            {isGenerating ? "Cleaning..." : "Clean Data"}
          </Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>
      <div className="ai-tools__out" style={{ maxWidth: 800, margin: "20px auto 0" }}>
        {isGenerating ? <OutputSkeleton /> : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">Cleaned Data</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>{output.originalCount} → {output.cleanedCount} items</span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>{output.removedCount} removed</span>
              </div>
            </div>
            {output.changes.length > 0 && <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", marginBottom: 12 }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(245,158,11,0.7)", marginBottom: 4 }}>Changes Made</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{output.changes.map((c, i) => <li key={i} style={{ padding: "2px 0", fontSize: "0.82rem", color: "rgba(200,210,230,0.7)", display: "flex", gap: 6 }}><span style={{ color: "#f59e0b" }}>→</span>{c.description}</li>)}</ul>
            </div>}
            <div style={{ padding: "16px 18px", borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.06)", whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", lineHeight: 1.5, color: "rgba(240,245,255,0.9)" }}>{output.cleanedData}</div>
            {output.validationReport && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 6, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 4 }}>★ Validation Report (Pro)</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.7)" }}>{output.validationReport.validRows} / {output.validationReport.totalRows} rows valid</div>
              {output.validationReport.issues.map((iss, i) => <div key={i} style={{ fontSize: "0.8rem", color: "rgba(239,68,68,0.7)", marginTop: 4 }}>Row {iss.row}, {iss.field}: {iss.issue}</div>)}
            </div>}
            <div style={{ height: 12 }} /><OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : <EmptyState icon="◇" title="Your cleaned data will appear here" description="Paste your data and click Clean Data." />}
      </div>
      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
