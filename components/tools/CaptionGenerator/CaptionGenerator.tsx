"use client";

import { useState, useCallback } from "react";
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
  generateCaptions,
  type Platform,
  type CaptionParams,
  type CaptionVariants,
  type CaptionOption,
} from "@/lib/services/captionService";

const TONE_OPTIONS = [
  { value: "funny", label: "Funny" },
  { value: "inspiring", label: "Inspiring" },
  { value: "educational", label: "Educational" },
  { value: "promotional", label: "Promotional" },
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Professional" },
  { value: "emotional", label: "Emotional" },
];

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "instagram", label: "Instagram", color: "#f72585" },
  { id: "facebook", label: "Facebook", color: "#1877f2" },
  { id: "tiktok", label: "TikTok", color: "#000000" },
  { id: "linkedin", label: "LinkedIn", color: "#0a66c2" },
  { id: "twitter", label: "X / Twitter", color: "#1d9bf0" },
  { id: "youtube", label: "YouTube", color: "#ff0000" },
];

const EMOJI_LEVELS = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

export function CaptionGenerator() {
  const { usage, incrementUsage } = useUsageLimit("captions");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [contentDescription, setContentDescription] = useState("");
  const [businessType, setBusinessType] = useState<CaptionParams["businessType"]>("general");
  const [goal, setGoal] = useState<CaptionParams["goal"]>("engagement");
  const [selectedTones, setSelectedTones] = useState<CaptionParams["tones"]>(["casual"]);
  const [hashtagCount, setHashtagCount] = useState(5);
  const [emojiLevel, setEmojiLevel] = useState<CaptionParams["emojiLevel"]>("moderate");
  const [ctaType, setCtaType] = useState<CaptionParams["ctaType"]>("none");

  const [activePlatform, setActivePlatform] = useState<Platform>("instagram");
  const [activeVariant, setActiveVariant] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputs, setOutputs] = useState<Record<Platform, CaptionVariants> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);

  const toggleTone = (tone: CaptionParams["tones"][number]) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone],
    );
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Caption Generator");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const platforms: Platform[] = batchMode
        ? ["instagram", "facebook", "tiktok", "linkedin", "twitter", "youtube"]
        : [activePlatform];

      const result = await generateCaptions(
        {
          contentDescription,
          businessType,
          goal,
          tones: selectedTones,
          hashtagCount,
          emojiLevel,
          ctaType,
        },
        platforms,
      );
      setOutputs(result);
      if (batchMode) setActivePlatform("instagram");
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [contentDescription, businessType, goal, selectedTones, hashtagCount, emojiLevel, ctaType, activePlatform, batchMode, usage.isBlocked, openUpgrade, incrementUsage]);

  const currentOutput = outputs?.[activePlatform];
  const currentVariant = currentOutput?.variants?.[activeVariant];

  const handleCopy = () => currentVariant?.body || "";

  const platformMockups: Record<Platform, React.ReactNode> = {
    instagram: (
      <div
        style={{
          background: "#09090b",
          borderRadius: "16px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 300,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div
            style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #f72585, #b5179e)" }}
          />
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>your_account</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Sponsored</div>
          </div>
        </div>
        <div
          style={{
            height: 200,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #f72585, #4cc9f0)",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
        >
          ◈
        </div>
        <div style={{ fontSize: "0.82rem", lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>
          {currentVariant?.body || "Your caption will appear here..."}
        </div>
      </div>
    ),
    facebook: (
      <div
        style={{
          background: "#09090b",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1877f2" }} />
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1877f2" }}>Your Page</div>
          </div>
        </div>
        <div style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>
          {currentVariant?.body || "Your caption will appear here..."}
        </div>
      </div>
    ),
    tiktok: (
      <div
        style={{
          background: "#09090b",
          borderRadius: "16px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 300,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            height: 200,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #000, #1a1a2e)",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
        >
          ◈
        </div>
        <div style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>
          {currentVariant?.body || "Your caption will appear here..."}
        </div>
      </div>
    ),
    linkedin: (
      <div
        style={{
          background: "#09090b",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0a66c2" }} />
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Your Name</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Title at Company</div>
          </div>
        </div>
        <div style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
          {currentVariant?.body || "Your post will appear here..."}
        </div>
      </div>
    ),
    twitter: (
      <div
        style={{
          background: "#09090b",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 380,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1d9bf0" }} />
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Your Name</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>@yourhandle</div>
          </div>
        </div>
        <div style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>
          {currentVariant?.body || "Your tweet will appear here..."}
        </div>
      </div>
    ),
    youtube: (
      <div
        style={{
          background: "#09090b",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            height: 160,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #ff0000, #cc0000)",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
        >
          ▶
        </div>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: "4px" }}>
          Video Title
        </div>
        <div style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "rgba(255,255,255,0.7)" }}>
          {currentVariant?.body || "Your description will appear here..."}
        </div>
      </div>
    ),
  };

  return (
    <>
      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Captions today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            <TextArea
              label="What's your post about?"
              placeholder="Describe your post content, offer, or message..."
              value={contentDescription}
              onChange={(e) => setContentDescription(e.target.value)}
              rows={4}
              maxLength={300}
              showCount
            />

            <div className="ai-tools__field-row ai-tools__field-row--3">
              <SelectInput
                label="Business type"
                options={[
                  { value: "general", label: "General" },
                  { value: "restaurant", label: "Restaurant" },
                  { value: "retail", label: "Retail" },
                  { value: "fitness", label: "Fitness" },
                  { value: "beauty", label: "Beauty" },
                  { value: "tech", label: "Tech" },
                  { value: "personal-brand", label: "Personal Brand" },
                  { value: "real-estate", label: "Real Estate" },
                ]}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as CaptionParams["businessType"])}
              />
              <SelectInput
                label="Goal"
                options={[
                  { value: "engagement", label: "Engagement" },
                  { value: "awareness", label: "Brand Awareness" },
                  { value: "traffic", label: "Drive Traffic" },
                  { value: "sales", label: "Sales / Promo" },
                  { value: "entertainment", label: "Entertainment" },
                ]}
                value={goal}
                onChange={(e) => setGoal(e.target.value as CaptionParams["goal"])}
              />
              <SelectInput
                label="Emoji use"
                options={EMOJI_LEVELS}
                value={emojiLevel}
                onChange={(e) => setEmojiLevel(e.target.value as CaptionParams["emojiLevel"])}
              />
            </div>

            {/* Tone chips */}
            <div className="ai-tools__field">
              <label className="ai-tools__label">Tone (select one or more)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.value}
                    className="ai-tools__btn ai-tools__btn--ghost"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.82rem",
                      background: selectedTones.includes(tone.value as any)
                        ? "rgba(124,58,237,0.2)"
                        : "rgba(0,0,0,0.2)",
                      borderColor: selectedTones.includes(tone.value as any)
                        ? "rgba(124,58,237,0.4)"
                        : "rgba(255,255,255,0.08)",
                      transform: selectedTones.includes(tone.value as any) ? "scale(1.05)" : "scale(1)",
                    }}
                    onClick={() => toggleTone(tone.value as CaptionParams["tones"][number])}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-tools__field-row">
              <SelectInput
                label="Hashtag count"
                options={[
                  { value: "0", label: "0" },
                  { value: "5", label: "5" },
                  { value: "10", label: "10" },
                  { value: "15", label: "15" },
                  { value: "20", label: "20" },
                  { value: "30", label: "30" },
                ]}
                value={String(hashtagCount)}
                onChange={(e) => setHashtagCount(Number(e.target.value))}
              />
              <SelectInput
                label="Call to action"
                options={[
                  { value: "none", label: "None" },
                  { value: "link-in-bio", label: "Link in Bio" },
                  { value: "comment-below", label: "Comment Below" },
                  { value: "follow-us", label: "Follow Us" },
                  { value: "share", label: "Share" },
                  { value: "tag-a-friend", label: "Tag a Friend" },
                  { value: "shop-now", label: "Shop Now" },
                ]}
                value={ctaType}
                onChange={(e) => setCtaType(e.target.value as CaptionParams["ctaType"])}
              />
            </div>

            {/* Batch mode toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="batch-mode"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
                style={{ accentColor: "#7c3aed" }}
              />
              <label htmlFor="batch-mode" style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.7)" }}>
                Generate for all 6 platforms at once
              </label>
            </div>

            <div className="ai-tools__actions">
              <Button
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                disabled={!contentDescription || isGenerating}
                onClick={handleGenerate}
              >
                {batchMode ? "Generate All" : "Generate Captions"}
              </Button>
              {error && <p className="ai-tools__err">{error}</p>}
            </div>
          </div>
        }
        right={
          <div className="ai-tools__out">
            {isGenerating ? (
              <OutputSkeleton />
            ) : outputs ? (
              <>
                <div className="ai-tools__out-header">
                  <h3 className="ai-tools__out-title">Platform Preview</h3>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "rgba(200,210,230,0.5)",
                    }}
                  >
                    {currentOutput?.charLimit.toLocaleString()} char limit
                  </div>
                </div>

                {/* Platform tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {(batchMode ? PLATFORMS : [PLATFORMS.find((p) => p.id === activePlatform)!]).map((p) => (
                    <button
                      key={p.id}
                      className="ai-tools__btn ai-tools__btn--ghost"
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.82rem",
                        borderColor: activePlatform === p.id ? p.color + "60" : "rgba(255,255,255,0.08)",
                        background: activePlatform === p.id ? `${p.color}15` : "transparent",
                        fontWeight: activePlatform === p.id ? 600 : 400,
                      }}
                      onClick={() => setActivePlatform(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Mockup */}
                <div style={{ marginBottom: "16px" }}>{platformMockups[activePlatform]}</div>

                {/* Variant selector */}
                {currentOutput && (
                  <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "12px" }}>
                    {currentOutput.variants.map((_, i) => (
                      <button
                        key={i}
                        className="ai-tools__btn ai-tools__btn--ghost"
                        style={{
                          width: 32,
                          height: 32,
                          padding: 0,
                          borderRadius: "50%",
                          fontSize: "0.8rem",
                          fontWeight: activeVariant === i ? 700 : 400,
                          background: activeVariant === i ? "rgba(124,58,237,0.3)" : "rgba(0,0,0,0.2)",
                          borderColor:
                            activeVariant === i ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)",
                        }}
                        onClick={() => setActiveVariant(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* Char limit bar */}
                {currentVariant && (
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.72rem",
                        color:
                          currentVariant.totalChars > currentOutput!.charLimit
                            ? "#ef4444"
                            : currentVariant.totalChars > currentOutput!.charLimit * 0.9
                              ? "#f59e0b"
                              : "rgba(200,210,230,0.6)",
                        marginBottom: "4px",
                      }}
                    >
                      <span>Characters</span>
                      <span>
                        {currentVariant.totalChars} / {currentOutput!.charLimit}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "4px",
                        borderRadius: "2px",
                        background: "rgba(255,255,255,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, (currentVariant.totalChars / currentOutput!.charLimit) * 100)}%`,
                          height: "100%",
                          borderRadius: "2px",
                          background:
                            currentVariant.totalChars > currentOutput!.charLimit
                              ? "#ef4444"
                              : currentVariant.totalChars > currentOutput!.charLimit * 0.9
                                ? "#f59e0b"
                                : "#7c3aed",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {currentVariant && currentVariant.hashtags.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                      marginBottom: "12px",
                    }}
                  >
                    {currentVariant.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          background: "rgba(247,37,133,0.1)",
                          color: "#f72585",
                          border: "1px solid rgba(247,37,133,0.2)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <OutputActions onCopy={handleCopy} showExport={false} />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your caption will appear here"
                description="Describe your post, pick your settings, and click Generate Captions."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
