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
import { generateEssayOutline, type EssayOutlineResult } from "@/lib/services/essayOutlinerService";

const ESSAY_TYPES = [
  { value: "argumentative", label: "Argumentative" },
  { value: "persuasive", label: "Persuasive" },
  { value: "expository", label: "Expository" },
  { value: "narrative", label: "Narrative" },
  { value: "compare-contrast", label: "Compare & Contrast" },
  { value: "cause-effect", label: "Cause & Effect" },
  { value: "problem-solution", label: "Problem & Solution" },
];

export function EssayOutliner() {
  const { usage, incrementUsage } = useUsageLimit("essay-outliner");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [topic, setTopic] = useState("");
  const [essayType, setEssayType] = useState("argumentative");
  const [thesis, setThesis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [researchNotes, setResearchNotes] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<EssayOutlineResult | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useProFeatures, setUseProFeatures] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Essay Outliner");
      return;
    }

    if (useProFeatures && usage.isBlocked) {
      openUpgrade("Essay Outliner (Pro)");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateEssayOutline({
        topic,
        essayType: essayType as EssayOutlinerParams["essayType"],
        thesis,
        instructions,
        researchNotes,
        isPro: useProFeatures,
      });
      setOutput(result);
      if (result.outline.length > 0) {
        setActiveSection(result.outline[0].section);
      }
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, essayType, thesis, instructions, researchNotes, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const formattedOutline = output
    ? output.outline.map(
        (s) => `${s.section}. ${s.heading}\n${s.points.map((p) => `  • ${p}`).join("\n")}`
      ).join("\n\n")
    : "";

  const handleCopy = () => {
    if (!output) return "";
    return `Thesis: ${output.thesis}\n\n${formattedOutline}\n\nConclusion:\n${output.conclusion.restateThesis}\n${output.conclusion.summaryPoints.map((p) => `  • ${p}`).join("\n")}`;
  };

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Outlines today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        <TextInput
          label="Essay Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. The impact of social media on mental health"
        />

        <div className="ai-tools__field-row ai-tools__field-row--2">
          <SelectInput
            label="Essay Type"
            options={ESSAY_TYPES}
            value={essayType}
            onChange={(e) => setEssayType(e.target.value)}
          />
          <TextInput
            label="Your Thesis (optional)"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Social media has both positive and negative effects..."
          />
        </div>

        <TextArea
          label="Special Instructions (optional)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Focus on teenage users, include counter-arguments, use a formal academic tone"
          rows={3}
        />

        <TextArea
          label="Research Notes (Pro) — paste your sources & notes"
          value={researchNotes}
          onChange={(e) => setResearchNotes(e.target.value)}
          placeholder="AI will generate an outline based on your actual research material..."
          rows={4}
          hint={useProFeatures ? `${researchNotes.split(/\s+/).filter(Boolean).length} words` : "★ Pro feature — paste your research and AI will build the outline from it"}
        />

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: useProFeatures ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${useProFeatures ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}`,
          marginBottom: 12,
          cursor: "pointer",
        }}
          onClick={() => {
            if (usage.isBlocked) {
              openUpgrade("Pro features");
              return;
            }
            setUseProFeatures(!useProFeatures);
          }}
        >
          <input
            type="checkbox"
            checked={useProFeatures}
            readOnly
            style={{ accentColor: "#c9a84c" }}
          />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}>
            <strong>Enable Pro features</strong> — Counter-arguments, evidence gap detection, alternative structures
          </div>
        </div>

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={!topic || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating..." : "Generate Outline"}
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
              <h3 className="ai-tools__out-title">Essay Outline</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  ~{output.estimatedWords} words
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  {output.difficulty}
                </span>
              </div>
            </div>

            {/* Thesis */}
            <div style={{
              padding: "14px 16px",
              borderRadius: 8,
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.2)",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 4 }}>
                Thesis Statement
              </div>
              <div style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "rgba(240,245,255,0.9)" }}>
                {output.thesis}
              </div>
            </div>

            {/* Outline sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {output.outline.map((section) => (
                <div
                  key={section.section}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${activeSection === section.section ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)"}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      background: activeSection === section.section ? "rgba(124,58,237,0.08)" : "rgba(0,0,0,0.15)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onClick={() => setActiveSection(activeSection === section.section ? null : section.section)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontWeight: 700,
                        color: "#7c3aed",
                        fontSize: "0.85rem",
                        minWidth: 24,
                      }}>
                        {section.section}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "rgba(240,245,255,0.9)" }}>
                        {section.heading}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.72rem", color: "rgba(200,210,230,0.5)" }}>
                        ~{section.estimatedParagraphs} para{section.estimatedParagraphs > 1 ? "s" : ""}
                      </span>
                      {section.evidenceNeeded && (
                        <span style={{ fontSize: "0.65rem", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", padding: "1px 6px", borderRadius: 3 }}>
                          Evidence needed
                        </span>
                      )}
                    </div>
                  </div>
                  {activeSection === section.section && (
                    <div style={{ padding: "10px 14px 14px 44px" }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {section.points.map((point, i) => (
                          <li
                            key={i}
                            style={{
                              padding: "4px 0",
                              fontSize: "0.88rem",
                              color: "rgba(200,210,230,0.75)",
                              display: "flex",
                              gap: 8,
                            }}
                          >
                            <span style={{ color: "#7c3aed", flexShrink: 0 }}>•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Conclusion */}
            <div style={{
              padding: "14px 16px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.06)",
              marginTop: 12,
            }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 6 }}>
                Conclusion
              </div>
              <div style={{ fontSize: "0.9rem", color: "rgba(240,245,255,0.85)", marginBottom: 8 }}>
                {output.conclusion.restateThesis}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {output.conclusion.summaryPoints.map((p, i) => (
                  <li key={i} style={{ padding: "2px 0", fontSize: "0.85rem", color: "rgba(200,210,230,0.65)", display: "flex", gap: 6 }}>
                    <span style={{ color: "#7c3aed" }}>•</span>
                    {p}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 8, fontSize: "0.9rem", color: "rgba(240,245,255,0.9)", fontStyle: "italic" }}>
                "{output.conclusion.closingThought}"
              </div>
            </div>

            {/* Pro features */}
            {output.alternativeStructures && output.alternativeStructures.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 8 }}>
                  ★ Alternative Structures (Pro)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {output.alternativeStructures.map((alt, i) => (
                    <div key={i} style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: "rgba(201,168,76,0.08)",
                      border: "1px solid rgba(201,168,76,0.15)",
                    }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#c9a84c", marginBottom: 2 }}>
                        {alt.type}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>
                        {alt.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {output.counterArguments && output.counterArguments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#c9a84c", marginBottom: 8 }}>
                  ★ Counter-Arguments (Pro)
                </div>
                {output.counterArguments.map((ca, i) => (
                  <div key={i} style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.15)",
                    marginBottom: 6,
                  }}>
                    <div style={{ fontSize: "0.85rem", color: "rgba(240,245,255,0.85)", marginBottom: 4 }}>
                      <strong>Counter:</strong> {ca.argument}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>
                      <strong>Rebuttal:</strong> {ca.rebuttal}
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
            title="Your essay outline will appear here"
            description="Enter your topic and essay type, then click Generate Outline."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
