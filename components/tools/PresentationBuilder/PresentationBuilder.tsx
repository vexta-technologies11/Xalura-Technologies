"use client";

import { useState, useCallback } from "react";
import { SplitPanel } from "@/components/shared/SplitPanel";
import { TextInput } from "@/components/shared/TextInput";
import { TextArea } from "@/components/shared/TextArea";
import { SelectInput } from "@/components/shared/SelectInput";
import { Button } from "@/components/shared/Button";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import {
  generatePresentation,
  type Slide,
  type SlideLayout,
} from "@/lib/services/presentationService";

const LAYOUT_ICONS: Record<SlideLayout, string> = {
  title: "T",
  content: "C",
  "two-column": "| |",
  quote: '"',
  stats: "#",
  agenda: "A",
  close: "X",
};

export function PresentationBuilder() {
  const { usage, incrementUsage } = useUsageLimit("presentation");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [topic, setTopic] = useState("");
  const [purpose, setPurpose] = useState<"inform" | "persuade" | "teach" | "pitch" | "report">("inform");
  const [audience, setAudience] = useState<"general" | "executives" | "technical" | "students" | "customers">("general");
  const [tone, setTone] = useState<"professional" | "academic" | "persuasive" | "casual" | "inspirational">("professional");
  const [slideCount, setSlideCount] = useState(8);
  const [customSections, setCustomSections] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [speakerNotes, setSpeakerNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Presentation Builder");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const sections = customSections
        ? customSections.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const result = await generatePresentation({
        topic,
        purpose,
        audience,
        tone,
        slideCount,
        customSections: sections,
      });

      setSlides(result);
      setCurrentSlideIndex(0);

      const notes: Record<string, string> = {};
      result.forEach((s) => {
        notes[s.id] = s.notes;
      });
      setSpeakerNotes(notes);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, purpose, audience, tone, slideCount, customSections, usage.isBlocked, openUpgrade, incrementUsage]);

  const currentSlide = slides[currentSlideIndex];

  const handleSlideReorder = (fromIndex: number, toIndex: number) => {
    const updated = [...slides];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSlides(updated);
    setCurrentSlideIndex(toIndex);
  };

  return (
    <>
      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Presentations today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            <TextInput
              label="Presentation topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Q4 Marketing Strategy"
            />

            <div className="ai-tools__field-row ai-tools__field-row--3">
              <SelectInput
                label="Purpose"
                options={[
                  { value: "inform", label: "Inform" },
                  { value: "persuade", label: "Persuade" },
                  { value: "teach", label: "Teach" },
                  { value: "pitch", label: "Pitch" },
                  { value: "report", label: "Report" },
                ]}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
              />
              <SelectInput
                label="Audience"
                options={[
                  { value: "general", label: "General" },
                  { value: "executives", label: "Executives" },
                  { value: "technical", label: "Technical" },
                  { value: "students", label: "Students" },
                  { value: "customers", label: "Customers" },
                ]}
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
              />
              <SelectInput
                label="Tone"
                options={[
                  { value: "professional", label: "Professional" },
                  { value: "academic", label: "Academic" },
                  { value: "persuasive", label: "Persuasive" },
                  { value: "casual", label: "Casual" },
                  { value: "inspirational", label: "Inspirational" },
                ]}
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
              />
            </div>

            <div className="ai-tools__field-row">
              <SelectInput
                label="Number of slides"
                options={Array.from({ length: 16 }, (_, i) => ({
                  value: String(i + 5),
                  label: String(i + 5),
                }))}
                value={String(slideCount)}
                onChange={(e) => setSlideCount(Number(e.target.value))}
              />
            </div>

            <TextArea
              label="Sections (optional, comma-separated)"
              placeholder="Introduction, Problem, Solution, Results, Next Steps"
              value={customSections}
              onChange={(e) => setCustomSections(e.target.value)}
              rows={2}
            />

            <div className="ai-tools__actions">
              <Button
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                disabled={!topic || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? "Creating slides..." : "Generate Presentation"}
              </Button>
              {error && <p className="ai-tools__err">{error}</p>}
            </div>
          </div>
        }
        right={
          <div className="ai-tools__out">
            {isGenerating ? (
              <OutputSkeleton />
            ) : slides.length > 0 && currentSlide ? (
              <>
                <div className="ai-tools__out-header">
                  <h3 className="ai-tools__out-title">
                    {LAYOUT_ICONS[currentSlide.layout]} Slide {currentSlideIndex + 1} of {slides.length}
                  </h3>
                </div>

                {/* Main slide preview */}
                <div
                  style={{
                    background: "#f8f9fa",
                    color: "#1a1a3e",
                    borderRadius: "12px",
                    padding: "32px",
                    minHeight: 280,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
                    marginBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: currentSlide.layout === "title" || currentSlide.layout === "close" || currentSlide.layout === "quote"
                      ? "center"
                      : "flex-start",
                    textAlign: currentSlide.layout === "title" || currentSlide.layout === "close" || currentSlide.layout === "quote"
                      ? "center"
                      : "left",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      margin: "0 0 12px",
                      color: "#1a1a3e",
                      lineHeight: 1.3,
                    }}
                  >
                    {currentSlide.title}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {currentSlide.content.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "0.9rem",
                          color: "#333",
                          lineHeight: 1.5,
                        }}
                      >
                        {currentSlide.layout === "stats" ? (
                          <div
                            style={{
                              display: "inline-block",
                              padding: "8px 16px",
                              margin: "4px",
                              borderRadius: "8px",
                              background: "rgba(124,58,237,0.08)",
                              border: "1px solid rgba(124,58,237,0.15)",
                              fontWeight: 600,
                              fontSize: "0.95rem",
                            }}
                          >
                            {item}
                          </div>
                        ) : (
                          <span>{item}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filmstrip */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    overflowX: "auto",
                    paddingBottom: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      className="ai-tools__btn ai-tools__btn--ghost"
                      style={{
                        flexShrink: 0,
                        width: 80,
                        height: 52,
                        padding: "4px",
                        fontSize: "0.6rem",
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "2px",
                        background: i === currentSlideIndex ? "rgba(124,58,237,0.2)" : "rgba(0,0,0,0.2)",
                        borderColor: i === currentSlideIndex ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)",
                        cursor: "grab",
                        overflow: "hidden",
                      }}
                      onClick={() => setCurrentSlideIndex(i)}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const from = Number(e.dataTransfer.getData("text/plain"));
                        handleSlideReorder(from, i);
                      }}
                    >
                      <span style={{ fontSize: "0.7rem" }}>{LAYOUT_ICONS[slide.layout]}</span>
                      <span
                        style={{
                          fontSize: "0.55rem",
                          color: "rgba(200,210,230,0.6)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                        }}
                      >
                        {slide.title.slice(0, 12)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  >
                    ← Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentSlideIndex >= slides.length - 1}
                    onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                  >
                    Next →
                  </Button>
                </div>

                {/* Speaker notes */}
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      color: "rgba(200,210,230,0.4)",
                      marginBottom: "6px",
                    }}
                  >
                    Speaker Notes
                  </div>
                  <textarea
                    className="ai-tools__input"
                    style={{ minHeight: 60, fontSize: "0.82rem" }}
                    value={speakerNotes[currentSlide.id] || ""}
                    onChange={(e) =>
                      setSpeakerNotes((prev) => ({
                        ...prev,
                        [currentSlide.id]: e.target.value,
                      }))
                    }
                    placeholder="Type speaker notes for this slide..."
                  />
                </div>
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your presentation will appear here"
                description="Enter a topic, choose your settings, and click Generate."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
