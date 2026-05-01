"use client";

import { useState, useCallback } from "react";
import { SplitPanel } from "@/components/shared/SplitPanel";
import { TextArea } from "@/components/shared/TextArea";
import { SelectInput } from "@/components/shared/SelectInput";
import { Button } from "@/components/shared/Button";
import { UploadZone } from "@/components/shared/UploadZone";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { AntiBotPuzzle } from "@/components/shared/AntiBotPuzzle";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { useAntiBot } from "@/lib/antiBot";
import {
  summarizeDocument,
  type SummaryOptions,
  type SummaryOutput,
} from "@/lib/services/summarizerService";

type TabType = "summary" | "keypoints" | "takeaways" | "qa";

export function DocumentSummarizer() {
  const { usage, incrementUsage } = useUsageLimit("summarizer");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();
  const {
    isVerified,
    showPuzzle,
    puzzle,
    puzzleError,
    skippable,
    requestVerification,
    attemptPuzzle,
    resetVerification,
  } = useAntiBot();

  const [inputText, setInputText] = useState("");
  const [inputWords, setInputWords] = useState(0);

  const [summaryLength, setSummaryLength] = useState<SummaryOptions["length"]>("standard");
  const [summaryFormat, setSummaryFormat] = useState<SummaryOptions["format"]>("bullets");
  const [focusArea, setFocusArea] = useState<SummaryOptions["focus"]>("key-facts");
  const [audienceLevel, setAudienceLevel] = useState<SummaryOptions["audience"]>("general");

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<SummaryOutput | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [error, setError] = useState<string | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    setInputWords(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const handleFileParsed = (result: { text: string; wordCount: number }) => {
    setInputText(result.text);
    setInputWords(result.wordCount);
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Document Summarizer");
      return;
    }
    if (!isVerified && !skippable) {
      requestVerification();
      return;
    }
    if (inputWords < 10) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await summarizeDocument(inputText, {
        length: summaryLength,
        format: summaryFormat,
        focus: focusArea,
        audience: audienceLevel,
      });
      setOutput(result);
      setActiveTab("summary");
      incrementUsage();
      resetVerification();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, inputWords, summaryLength, summaryFormat, focusArea, audienceLevel, usage.isBlocked, isVerified, skippable, openUpgrade, incrementUsage, requestVerification, resetVerification]);

  function handlePuzzleAnswer(answer: string | number) {
    const success = attemptPuzzle(answer);
    if (success) {
      handleGenerate();
    }
  }

  const summaryText = output ? output.summary : "";
  const keyPointsText = output ? output.keyPoints.map((kp) => `• ${kp}`).join("\n") : "";
  const handleCopy = () => {
    const texts: Record<TabType, string> = {
      summary: summaryText,
      keypoints: keyPointsText,
      takeaways: output ? output.takeaways.map((t) => `${t.headline}: ${t.detail}`).join("\n") : "",
      qa: output ? output.qaItems.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n") : "",
    };
    return texts[activeTab];
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "keypoints", label: "Key Points" },
    { id: "takeaways", label: "Takeaways" },
    { id: "qa", label: "Q&A" },
  ];

  return (
    <>
      {showPuzzle && puzzle && (
        <AntiBotPuzzle
          puzzle={puzzle}
          puzzleError={puzzleError}
          onAnswer={handlePuzzleAnswer}
          onClose={resetVerification}
          skippable={skippable}
          onSkip={() => {
            resetVerification();
            handleGenerate();
          }}
        />
      )}

      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Documents today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            <TextArea
              label="Paste your document"
              placeholder="Paste or type your document here (minimum 10 words)..."
              value={inputText}
              onChange={handleTextChange}
              rows={10}
              showCount
              hint={`${inputWords} words`}
            />

            <UploadZone
              acceptedTypes={[".txt", ".md"]}
              maxSizeMB={5}
              onFileParsed={handleFileParsed}
              onError={(err) => setError(err)}
              label="Or upload a file"
              sublabel="Supports .txt and .md files"
            />

            <div className="ai-tools__field-row ai-tools__field-row--3">
              <SelectInput
                label="Length"
                options={[
                  { value: "brief", label: "Brief (10%)" },
                  { value: "standard", label: "Standard (20%)" },
                  { value: "detailed", label: "Detailed (35%)" },
                ]}
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value as SummaryOptions["length"])}
              />
              <SelectInput
                label="Format"
                options={[
                  { value: "bullets", label: "Bullet Points" },
                  { value: "paragraphs", label: "Prose Paragraphs" },
                  { value: "qa", label: "Q&A" },
                  { value: "outline", label: "Hierarchical Outline" },
                ]}
                value={summaryFormat}
                onChange={(e) => setSummaryFormat(e.target.value as SummaryOptions["format"])}
              />
              <SelectInput
                label="Focus"
                options={[
                  { value: "key-facts", label: "Key Facts" },
                  { value: "action-items", label: "Action Items" },
                  { value: "conclusions", label: "Conclusions" },
                  { value: "arguments", label: "Arguments" },
                  { value: "data-points", label: "Data Points" },
                ]}
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value as SummaryOptions["focus"])}
              />
            </div>

            <div className="ai-tools__field-row">
              <SelectInput
                label="Audience"
                options={[
                  { value: "general", label: "General" },
                  { value: "expert", label: "Expert" },
                  { value: "simple", label: "Simple (plain English)" },
                ]}
                value={audienceLevel}
                onChange={(e) => setAudienceLevel(e.target.value as SummaryOptions["audience"])}
              />
            </div>

            <div className="ai-tools__actions">
              <Button
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                disabled={inputWords < 10 || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? "Compressing..." : "Summarize"}
              </Button>
              {error && <p className="ai-tools__err">{error}</p>}
            </div>
          </div>
        }
        right={
          <div className="ai-tools__out">
            {isGenerating ? (
              <OutputSkeleton />
            ) : output ? (
              <>
                <div className="ai-tools__out-header">
                  <h3 className="ai-tools__out-title">Document Summary</h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {output.stats.topicTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          background: "rgba(124,58,237,0.15)",
                          color: "#a78bfa",
                          border: "1px solid rgba(124,58,237,0.25)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        background: "rgba(16,185,129,0.15)",
                        color: "#34d399",
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}
                    >
                      {output.stats.sentiment}
                    </span>
                  </div>
                </div>

                {/* Compression Meter */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "16px",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 2 }}>
                      Original
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgba(240,245,255,0.9)" }}>
                      {output.stats.originalWords.toLocaleString()} words
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", color: "rgba(200,210,230,0.3)", fontSize: "1.2rem" }}>
                    → 
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 2 }}>
                      Summary
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#7c3aed" }}>
                      {output.stats.summaryWords.toLocaleString()} words
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 2 }}>
                      Time Saved
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>
                      ~{output.stats.timeSavedMinutes} min reading
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 2 }}>
                      Compression
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color:
                          output.stats.compressionRatio > 80
                            ? "#10b981"
                            : output.stats.compressionRatio > 50
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    >
                      -{output.stats.compressionRatio}%
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className="ai-tools__btn ai-tools__btn--ghost"
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.82rem",
                        fontWeight: activeTab === tab.id ? 600 : 400,
                        borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
                        borderRadius: 0,
                        background: "transparent",
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === "summary" && (
                  <div className="ai-tools__markdown" style={{ whiteSpace: "pre-wrap" }}>
                    {output.summary}
                  </div>
                )}
                {activeTab === "keypoints" && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {output.keyPoints.map((kp, i) => (
                      <li
                        key={i}
                        style={{
                          padding: "10px 12px",
                          marginBottom: "6px",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.15)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          display: "flex",
                          gap: "8px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ color: "#7c3aed", fontWeight: 700, flexShrink: 0 }}>•</span>
                        <span style={{ color: "rgba(240,245,255,0.9)", fontSize: "0.9rem" }}>{kp}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === "takeaways" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {output.takeaways.map((tw) => (
                      <div
                        key={tw.id}
                        style={{
                          padding: "14px",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.15)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            color: "rgba(200,210,230,0.5)",
                            marginBottom: "2px",
                          }}
                        >
                          {tw.category}
                        </div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "rgba(240,245,255,0.95)", marginBottom: "4px" }}>
                          {tw.headline}
                        </div>
                        <div style={{ fontSize: "0.88rem", color: "rgba(200,210,230,0.7)" }}>
                          {tw.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === "qa" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {output.qaItems.map((qa) => (
                      <div
                        key={qa.id}
                        style={{
                          padding: "14px",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.15)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "rgba(240,245,255,0.95)", marginBottom: "6px", fontSize: "0.9rem" }}>
                          Q: {qa.question}
                        </div>
                        <div style={{ color: "rgba(200,210,230,0.7)", fontSize: "0.88rem" }}>
                          A: {qa.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ height: 12 }} />
                <OutputActions
                  onCopy={handleCopy}
                  showExport={false}
                />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your summary will appear here"
                description="Paste or upload a document, choose your settings, and click Summarize."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
