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
import { generateEmailReply, type EmailReplyResult } from "@/lib/services/emailReplyService";
import type { EmailReplyParams } from "@/lib/services/prompts/emailReplyPrompt";

const REPLY_TYPES = [
  { value: "accept", label: "Accept" },
  { value: "decline", label: "Decline" },
  { value: "request-info", label: "Request Information" },
  { value: "thank", label: "Thank You" },
  { value: "follow-up", label: "Follow Up" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct & Concise" },
];

export function EmailReplyGenerator() {
  const { usage, incrementUsage } = useUsageLimit("email-reply");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [emailContext, setEmailContext] = useState("");
  const [replyType, setReplyType] = useState<EmailReplyParams["replyType"]>("accept");
  const [tone, setTone] = useState<EmailReplyParams["tone"]>("professional");
  const [customInstructions, setCustomInstructions] = useState("");
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<EmailReplyResult | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Email Reply Generator");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setActiveVariant(0);

    try {
      const result = await generateEmailReply({
        emailContext,
        replyType: replyType as EmailReplyParams["replyType"],
        tone: tone as EmailReplyParams["tone"],
        customInstructions,
        isPro: useProFeatures,
      });
      setOutput(result);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [emailContext, replyType, tone, customInstructions, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const getReplyBody = () => {
    if (!output) return "";
    if (useProFeatures && output.variants && output.variants.length > 0) {
      return output.variants[activeVariant]?.body || output.body;
    }
    return output.body;
  };

  const handleCopy = () => {
    const body = useProFeatures && output?.variants?.length
      ? output.variants[activeVariant]?.body || output.body
      : output?.body || "";
    return `Subject: ${output?.subjectLine || ""}\n\n${body}`;
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(handleCopy());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Replies today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        <TextArea
          label="Paste the email you received"
          placeholder="Paste the email or conversation context you're replying to..."
          value={emailContext}
          onChange={(e) => setEmailContext(e.target.value)}
          rows={8}
          hint={`${emailContext.split(/\s+/).filter(Boolean).length} words`}
        />

        <div className="ai-tools__field-row ai-tools__field-row--2">
          <SelectInput
            label="Reply Type"
            options={REPLY_TYPES}
            value={replyType}
            onChange={(e) => setReplyType(e.target.value as EmailReplyParams["replyType"])}
          />
          <SelectInput
            label="Tone"
            options={TONES}
            value={tone}
            onChange={(e) => setTone(e.target.value as EmailReplyParams["tone"])}
          />
        </div>

        <TextArea
          label="Custom Instructions (optional)"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g. Mention I'm on vacation until Friday, reference the project timeline..."
          rows={2}
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
          <input type="checkbox" checked={useProFeatures} readOnly style={{ accentColor: "#c9a84c" }} />
          <div style={{ fontSize: "0.85rem", color: useProFeatures ? "#c9a84c" : "rgba(200,210,230,0.6)" }}>
            <strong>Enable Pro features</strong> — Multiple variants, thread-aware replies
          </div>
        </div>

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={emailContext.split(/\s+/).filter(Boolean).length < 5 || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating..." : "Generate Reply"}
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
              <h3 className="ai-tools__out-title">Reply</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  {replyType} • {tone}
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  {output.wordCount} words
                </span>
              </div>
            </div>

            {/* Subject */}
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.88rem",
              color: "rgba(200,210,230,0.8)",
            }}>
              Subject: {output.subjectLine}
            </div>

            {/* Variant tabs (Pro) */}
            {useProFeatures && output.variants && output.variants.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                <button
                  className={`ai-tools__btn ${activeVariant === -1 ? "ai-tools__btn--primary" : ""}`}
                  style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                  onClick={() => setActiveVariant(-1)}
                >
                  Original
                </button>
                {output.variants.map((v) => (
                  <button
                    key={v.variant}
                    className={`ai-tools__btn ${activeVariant === v.variant ? "ai-tools__btn--primary" : ""}`}
                    style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                    onClick={() => setActiveVariant(v.variant)}
                  >
                    Variant {v.variant} ({v.tone})
                  </button>
                ))}
              </div>
            )}

            {/* Email body */}
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
              {output.salutation && <div style={{ marginBottom: 12 }}>{output.salutation},</div>}
              <div>{getReplyBody()}</div>
              <div style={{ marginTop: 16 }}>
                <div>{output.closing},</div>
                <div>{output.signatureName}</div>
              </div>
            </div>

            {/* Copy button */}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Button variant="primary" size="sm" onClick={handleCopyEmail}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>

            {/* Suggested actions */}
            {output.suggestedActions.length > 0 && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.15)",
                marginTop: 12,
              }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(245,158,11,0.7)", marginBottom: 4 }}>
                  Suggested Next Steps
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {output.suggestedActions.map((action, i) => (
                    <li key={i} style={{
                      fontSize: "0.85rem",
                      color: "rgba(200,210,230,0.7)",
                      padding: "2px 0",
                      display: "flex",
                      gap: 6,
                    }}>
                      <span style={{ color: "#f59e0b" }}>→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ height: 12 }} />
            <OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : (
          <EmptyState
            icon="@"
            title="Your email reply will appear here"
            description="Paste the email context and click Generate Reply."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
