"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SplitPanel } from "@/components/shared/SplitPanel";
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
  translateText,
  detectLanguage,
  LANGUAGES,
  type TranslationResult,
} from "@/lib/services/translatorService";

export function AITranslator() {
  const { usage, incrementUsage } = useUsageLimit("translator");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [sourceText, setSourceText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [formality, setFormality] = useState<"formal" | "informal">("informal");
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [mode, setMode] = useState<"text" | "document">("text");

  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPairs, setRecentPairs] = useState<{ source: string; target: string }[]>([]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect language
  useEffect(() => {
    if (sourceText.trim().length > 10 && sourceLanguage === "auto") {
      detectLanguage(sourceText).then((lang) => {
        setDetectedLanguage(lang);
      });
    } else {
      setDetectedLanguage(null);
    }
  }, [sourceText, sourceLanguage]);

  const handleTranslate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("AI Translator");
      return;
    }
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(
        sourceText,
        detectedLanguage || sourceLanguage,
        targetLanguage,
        { formality, preserveFormatting },
      );
      setTranslatedText(result.translated);
      incrementUsage();

      setRecentPairs((prev) => {
        const newPair = { source: detectedLanguage || sourceLanguage, target: targetLanguage };
        const filtered = prev.filter(
          (p) => p.source !== newPair.source || p.target !== newPair.target,
        );
        return [newPair, ...filtered].slice(0, 5);
      });
    } catch {
      setError("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLanguage, targetLanguage, detectedLanguage, formality, preserveFormatting, usage.isBlocked, openUpgrade, incrementUsage]);

  // Auto-translate with debounce (only after first manual translation)
  useEffect(() => {
    if (!translatedText) return; // don't auto-translate until user has manually translated once
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (sourceText.trim().length > 3) {
      debounceRef.current = setTimeout(() => {
        handleTranslate();
      }, 1500);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sourceText, targetLanguage, formality, translatedText]);

  const handleSwap = () => {
    const newSource = targetLanguage;
    const newTarget = detectedLanguage || sourceLanguage;
    setSourceLanguage(newSource === "auto" ? "en" : newSource);
    setTargetLanguage(newTarget);
    setSourceText(translatedText || "");
    setTranslatedText(sourceText);
  };

  const handleSpeak = () => {
    if (!translatedText) return;
    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(translatedText);
      const lang = LANGUAGES.find((l) => l.code === targetLanguage);
      if (lang) utterance.lang = lang.code;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const targetLang = LANGUAGES.find((l) => l.code === targetLanguage);
  const sourceLang = LANGUAGES.find((l) => l.code === (detectedLanguage || sourceLanguage));

  return (
    <>
      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Translations today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            {/* Language selection bar */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 140 }}>
                <SelectInput
                  label="From"
                  options={[
                    { value: "auto", label: "Auto-detect" },
                    ...LANGUAGES.map((l) => ({
                      value: l.code,
                      label: l.name,
                    })),
                  ]}
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwap}
                style={{ marginBottom: "8px", fontSize: "1.2rem" }}
              >
                ⇄
              </Button>

              <div style={{ flex: 1, minWidth: 140 }}>
                <SelectInput
                  label="To"
                  options={LANGUAGES.map((l) => ({
                    value: l.code,
                    label: l.name,
                  }))}
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                />
              </div>
            </div>

            {/* Detected language badge */}
            {detectedLanguage && sourceLanguage === "auto" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  background: "rgba(6,182,212,0.1)",
                  color: "#22d3ee",
                  border: "1px solid rgba(6,182,212,0.2)",
                }}
              >
                Detected: {LANGUAGES.find((l) => l.code === detectedLanguage)?.name || detectedLanguage}
              </div>
            )}

            {/* Recent pairs */}
            {recentPairs.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {recentPairs.slice(0, 3).map((pair, i) => (
                  <button
                    key={i}
                    className="ai-tools__btn ai-tools__btn--ghost"
                    style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                    onClick={() => {
                      setSourceLanguage(pair.source);
                      setTargetLanguage(pair.target);
                    }}
                  >
                    {LANGUAGES.find((l) => l.code === pair.source)?.name} →
                    {LANGUAGES.find((l) => l.code === pair.target)?.name}
                  </button>
                ))}
              </div>
            )}

            <TextArea
              label="Source text"
              placeholder={sourceLanguage === "auto" ? "Type or paste text to translate..." : `Type in ${sourceLang?.name || "your language"}...`}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={8}
              showCount
              hint={sourceLanguage === "auto" ? "Auto-detect enabled" : undefined}
            />

            <div className="ai-tools__field-row ai-tools__field-row--3">
              <SelectInput
                label="Formality"
                options={[
                  { value: "informal", label: "Informal / Natural" },
                  { value: "formal", label: "Formal / Professional" },
                ]}
                value={formality}
                onChange={(e) => setFormality(e.target.value as "formal" | "informal")}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "22px" }}>
                <input
                  type="checkbox"
                  id="preserve-format"
                  checked={preserveFormatting}
                  onChange={(e) => setPreserveFormatting(e.target.checked)}
                  style={{ accentColor: "#7c3aed" }}
                />
                <label htmlFor="preserve-format" style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>
                  Preserve formatting
                </label>
              </div>
            </div>

            <div className="ai-tools__actions">
              <Button
                variant="primary"
                size="lg"
                isLoading={isTranslating}
                disabled={!sourceText.trim() || isTranslating}
                onClick={handleTranslate}
              >
                {isTranslating ? "Translating..." : "Translate"}
              </Button>
              {error && <p className="ai-tools__err">{error}</p>}
            </div>
          </div>
        }
        right={
          <div className="ai-tools__out">
            {isTranslating ? (
              <OutputSkeleton />
            ) : translatedText ? (
              <>
                <div className="ai-tools__out-header">
                  <h3 className="ai-tools__out-title">
                    {targetLang?.name || "Translation"}
                  </h3>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSpeak}
                      style={{ fontSize: "0.8rem" }}
                    >
                      {isSpeaking ? "Stop" : "Listen"}
                    </Button>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.95rem",
                    lineHeight: 1.7,
                    color: "rgba(240,245,255,0.94)",
                    whiteSpace: "pre-wrap",
                    direction: targetLang?.rtl ? "rtl" : "ltr",
                    textAlign: targetLang?.rtl ? "right" : "left",
                  }}
                >
                  {translatedText}
                </div>

                <div style={{ height: 12 }} />
                <OutputActions
                  onCopy={() => translatedText}
                  showExport={false}
                />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your translation will appear here"
                description="Type or paste text on the left, choose your languages, and hit Translate."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
