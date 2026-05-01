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
import { generateFlashcards, type FlashcardResult } from "@/lib/services/flashcardService";
import type { FlashcardParams } from "@/lib/services/prompts/flashcardPrompt";

const FORMATS = [
  { value: "qa", label: "Q&A (Question → Answer)" },
  { value: "fill-blank", label: "Fill in the blank" },
  { value: "multiple-choice", label: "Multiple choice" },
];

const CARD_COUNTS = [
  { value: "5", label: "5 cards" },
  { value: "10", label: "10 cards" },
  { value: "15", label: "15 cards" },
  { value: "20", label: "20 cards" },
  { value: "30", label: "30 cards (Pro)" },
  { value: "50", label: "50 cards (Pro)" },
];

export function FlashcardGenerator() {
  const { usage, incrementUsage } = useUsageLimit("flashcard-generator");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [inputText, setInputText] = useState("");
  const [count, setCount] = useState("10");
  const [format, setFormat] = useState<FlashcardParams["format"]>("qa");

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<FlashcardResult | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProCount = ["30", "50"].includes(count);

  const handleFileParsed = (result: { text: string; wordCount: number }) => {
    setInputText(result.text);
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Flashcard Generator");
      return;
    }
    if (isProCount) {
      openUpgrade("Flashcard Generator (Pro card count)");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentCard(0);
    setShowAnswer(false);

    try {
      const result = await generateFlashcards({
        text: inputText,
        count: parseInt(count),
        format: format as FlashcardParams["format"],
      });
      setOutput(result);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, count, format, isProCount, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleCopy = () => {
    if (!output) return "";
    return output.cards.map((c) => `${c.term}\n${c.definition}\n`).join("\n");
  };

  const nextCard = () => {
    if (output && currentCard < output.cards.length - 1) {
      setCurrentCard(currentCard + 1);
      setShowAnswer(false);
    }
  };

  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setShowAnswer(false);
    }
  };

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Flashcard decks today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        <TextArea
          label="Paste your study material"
          placeholder="Paste notes, textbook excerpts, key terms and definitions..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={8}
          hint={`${inputText.split(/\s+/).filter(Boolean).length} words`}
        />

        <UploadZone
          acceptedTypes={[".txt", ".md", ".pdf", ".docx"]}
          maxSizeMB={10}
          onFileParsed={handleFileParsed}
          onError={(err) => setError(err)}
          label="Upload a document"
          sublabel="Supports .txt, .md, .pdf, .docx"
        />

        <div className="ai-tools__field-row ai-tools__field-row--3">
          <SelectInput
            label="Cards"
            options={CARD_COUNTS}
            value={count}
            onChange={(e) => {
              if (["30", "50"].includes(e.target.value) && usage.isBlocked) {
                openUpgrade("More flashcards (Pro)");
                return;
              }
              setCount(e.target.value);
            }}
          />
          <SelectInput
            label="Format"
            options={FORMATS}
            value={format}
            onChange={(e) => setFormat(e.target.value as FlashcardParams["format"])}
          />
        </div>

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={inputText.split(/\s+/).filter(Boolean).length < 10 || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating..." : "Generate Flashcards"}
          </Button>
          {error && <p className="ai-tools__err">{error}</p>}
        </div>
      </div>

      {/* Flashcard Viewer */}
      <div className="ai-tools__out" style={{ maxWidth: 600, margin: "20px auto 0" }}>
        {isGenerating ? (
          <OutputSkeleton />
        ) : output ? (
          <>
            <div className="ai-tools__out-header">
              <h3 className="ai-tools__out-title">{output.deckName}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  {output.totalCards} cards
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

            {/* Card */}
            <div
              style={{
                padding: "32px 24px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.08)",
                minHeight: 200,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onClick={() => setShowAnswer(!showAnswer)}
            >
              <div style={{
                textAlign: "center",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                color: "rgba(200,210,230,0.4)",
                marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {showAnswer ? "Answer" : "Question"} — Tap to flip
              </div>
              <div style={{
                fontSize: showAnswer ? "1.1rem" : "1.2rem",
                lineHeight: 1.5,
                textAlign: "center",
                color: showAnswer ? "rgba(16,185,129,0.95)" : "rgba(240,245,255,0.95)",
                fontWeight: showAnswer ? 400 : 600,
              }}>
                {showAnswer
                  ? output.cards[currentCard].definition
                  : output.cards[currentCard].term}
              </div>
              {showAnswer && output.cards[currentCard].explanation && (
                <div style={{
                  marginTop: 12,
                  fontSize: "0.82rem",
                  color: "rgba(200,210,230,0.5)",
                  textAlign: "center",
                }}>
                  {output.cards[currentCard].explanation}
                </div>
              )}
              <div style={{
                marginTop: 16,
                fontSize: "0.72rem",
                color: "rgba(200,210,230,0.3)",
                textAlign: "center",
              }}>
                {output.cards[currentCard].category}
              </div>
            </div>

            {/* Progress */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}>
              <button
                className="ai-tools__btn ai-tools__btn--ghost"
                onClick={prevCard}
                disabled={currentCard === 0}
                style={{ opacity: currentCard === 0 ? 0.4 : 1 }}
              >
                ← Previous
              </button>
              <span style={{
                fontSize: "0.85rem",
                color: "rgba(200,210,230,0.6)",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {currentCard + 1} / {output.totalCards}
              </span>
              <button
                className="ai-tools__btn ai-tools__btn--ghost"
                onClick={nextCard}
                disabled={currentCard >= output.cards.length - 1}
                style={{ opacity: currentCard >= output.cards.length - 1 ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              marginTop: 8,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${((currentCard + 1) / output.totalCards) * 100}%`,
                background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }} />
            </div>

            <div style={{ height: 12 }} />
            <OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : (
          <EmptyState
            icon="◈"
            title="Your flashcards will appear here"
            description="Paste your study material and click Generate Flashcards. Tap each card to flip."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
