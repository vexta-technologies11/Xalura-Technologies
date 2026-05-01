"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { SelectInput } from "@/components/shared/SelectInput";
import { TextArea } from "@/components/shared/TextArea";
import { UploadZone } from "@/components/shared/UploadZone";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { cleanNotes, type NoteTakerResult } from "@/lib/services/noteTakerService";

const MODES = [
  { value: "cleanup", label: "Clean up (free)" },
  { value: "summary", label: "Executive summary (Pro)" },
  { value: "study-guide", label: "Study guide (Pro)" },
];

const TEMPLATES = [
  { value: "outline", label: "Outline method" },
  { value: "cornell", label: "Cornell method" },
  { value: "concept", label: "Concept map text" },
];

export function NoteTaker() {
  const { usage, incrementUsage } = useUsageLimit("note-taker");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [rawNotes, setRawNotes] = useState("");
  const [mode, setMode] = useState("cleanup");
  const [template, setTemplate] = useState("outline");
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<NoteTakerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKeyTerms, setShowKeyTerms] = useState(false);

  const isProMode = mode === "summary" || mode === "study-guide";

  const handleFileParsed = (result: { text: string; wordCount: number }) => {
    setRawNotes(result.text);
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Note Taker");
      return;
    }
    if (isProMode && !useProFeatures) {
      openUpgrade("Note Taker (Pro mode)");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await cleanNotes({
        rawNotes,
        mode: mode as NoteTakerParams["mode"],
        template: template as NoteTakerParams["template"],
        isPro: useProFeatures && isProMode,
      });
      setOutput(result);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [rawNotes, mode, template, useProFeatures, isProMode, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => {
    if (!output) return "";
    return output.cleanedNotes;
  };

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Notes today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        <TextArea
          label="Paste your raw notes"
          placeholder="Paste messy lecture notes, meeting notes, or any raw text..."
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          rows={10}
          hint={`${rawNotes.split(/\s+/).filter(Boolean).length} words`}
        />

        <UploadZone
          acceptedTypes={[".txt", ".md", ".pdf", ".docx"]}
          maxSizeMB={10}
          onFileParsed={handleFileParsed}
          onError={(err) => setError(err)}
          label="Upload lecture notes or document"
          sublabel="Supports .txt, .md, .pdf, .docx"
        />

        <div className="ai-tools__field-row ai-tools__field-row--2">
          <SelectInput
            label="Mode"
            options={MODES}
            value={mode}
            onChange={(e) => {
              if (["summary", "study-guide"].includes(e.target.value) && usage.isBlocked) {
                openUpgrade("Note Taker (Pro)");
                return;
              }
              setMode(e.target.value);
              if (["summary", "study-guide"].includes(e.target.value)) {
                setUseProFeatures(true);
              }
            }}
          />
          <SelectInput
            label="Template"
            options={TEMPLATES}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
        </div>

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={rawNotes.split(/\s+/).filter(Boolean).length < 10 || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? "Organizing..." : "Clean Notes"}
          </Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>

      {/* Output */}
      <div className="ai-tools__out" style={{ maxWidth: 800, margin: "20px auto 0" }}>
        {isGenerating ? (
          <OutputSkeleton />
        ) : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">Organized Notes</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  {output.originalWordCount} → {output.wordCount} words
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  ~{output.estimatedReadingTimeMinutes} min read
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}>
              {output.topics.map((topic) => (
                <span
                  key={topic}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: "0.78rem",
                    background: "rgba(124,58,237,0.1)",
                    color: "#a78bfa",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>

            {/* Key terms toggle */}
            {output.keyTerms.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <button
                  className="ai-tools__btn ai-tools__btn--ghost"
                  style={{ fontSize: "0.85rem", marginBottom: showKeyTerms ? 8 : 0 }}
                  onClick={() => setShowKeyTerms(!showKeyTerms)}
                >
                  {showKeyTerms ? "Hide" : "Show"} Key Terms ({output.keyTerms.length})
                </button>
                {showKeyTerms && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {output.keyTerms.map((kt, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          background: "rgba(0,0,0,0.15)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#e8a838", fontSize: "0.88rem" }}>
                          {kt.term}
                        </span>
                        <span style={{ color: "rgba(200,210,230,0.7)", fontSize: "0.85rem" }}>
                          {kt.definition}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cleaned notes */}
            <div style={{
              padding: "16px 18px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.06)",
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: "0.9rem",
              color: "rgba(240,245,255,0.9)",
            }}>
              {output.cleanedNotes}
            </div>

            {/* Review questions (Pro study guide) */}
            {output.reviewQuestions && output.reviewQuestions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 8 }}>
                  ★ Review Questions
                </div>
                {output.reviewQuestions.map((rq, i) => (
                  <div key={i} style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.15)",
                    marginBottom: 6,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "rgba(240,245,255,0.9)", marginBottom: 4 }}>
                      Q: {rq.question}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.65)" }}>
                      A: {rq.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: 12 }} />
            <OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : (
          <EmptyState
            icon="◇"
            title="Your organized notes will appear here"
            description="Paste or upload your raw notes and click Clean Notes."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
