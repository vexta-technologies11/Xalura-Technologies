"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { TextInput } from "@/components/shared/TextInput";
import { TextArea } from "@/components/shared/TextArea";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { generateMeetingAgenda, type MeetingAgendaResult } from "@/lib/services/meetingAgendaService";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function MeetingAgenda() {
  const { usage, incrementUsage } = useUsageLimit("meeting-agenda");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [topic, setTopic] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [discussionPoints, setDiscussionPoints] = useState<string[]>([""]);
  const [attendees, setAttendees] = useState("");
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<MeetingAgendaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePointChange = (index: number, value: string) => {
    const updated = [...discussionPoints];
    updated[index] = value;
    if (value && index === updated.length - 1) {
      updated.push("");
    }
    const filtered = updated.filter((p, i) => p || i === updated.length - 1);
    setDiscussionPoints(filtered);
  };

  const removePoint = (index: number) => {
    if (discussionPoints.length > 1) {
      setDiscussionPoints(discussionPoints.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Meeting Agenda");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateMeetingAgenda({
        topic,
        durationMinutes,
        discussionPoints: discussionPoints.filter(Boolean),
        attendees: attendees ? attendees.split(",").map((a) => a.trim()).filter(Boolean) : undefined,
        isPro: useProFeatures,
      });
      setOutput(result);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, durationMinutes, discussionPoints, attendees, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const formattedAgenda = output
    ? `${output.meetingTitle}\n${output.estimatedEndTime}\n\n${output.items.map((i) => `${i.duration}min — ${i.title}\n  ${i.description}`).join("\n\n")}\n\nNext Steps: ${output.nextSteps}`
    : "";

  const handleCopy = () => formattedAgenda;

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Agendas today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        <TextInput
          label="Meeting Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Q1 Marketing Review"
        />

        <div className="ai-tools__field-row ai-tools__field-row--2">
          <div className="ai-tools__field">
            <label className="ai-tools__label">Duration (minutes)</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  className={`ai-tools__btn ${durationMinutes === d ? "ai-tools__btn--primary" : ""}`}
                  style={{ padding: "6px 12px", fontSize: "0.85rem", flex: 1, minWidth: 50 }}
                  onClick={() => setDurationMinutes(d)}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
          <TextInput
            label="Attendees (comma separated)"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Alice, Bob, Charlie"
          />
        </div>

        <div className="ai-tools__field">
          <label className="ai-tools__label">Discussion Points</label>
          {discussionPoints.map((point, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <input
                className="ai-tools__input"
                style={{ flex: 1, minHeight: 36, padding: "8px 10px" }}
                value={point}
                onChange={(e) => handlePointChange(i, e.target.value)}
                placeholder={`Point ${i + 1}`}
              />
              {i < discussionPoints.length - 1 && (
                <button
                  className="ai-tools__btn ai-tools__btn--ghost"
                  style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                  onClick={() => removePoint(i)}
                >
                  X
                </button>
              )}
            </div>
          ))}
        </div>

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
            <strong>Enable Pro features</strong> — Attendee roles, pre-meeting prep notes
          </div>
        </div>

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={!topic || discussionPoints.filter(Boolean).length === 0 || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating..." : "Generate Agenda"}
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
              <h3 className="ai-tools__out-title">{output.meetingTitle}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  {output.totalDuration} min • {output.totalItems} items
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  Ends ~{output.estimatedEndTime}
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}>
                  Prep: {output.recommendedPrepTime}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {output.items.map((item, i) => {
                const colors: Record<string, string> = {
                  opening: "rgba(16,185,129,0.2)",
                  discussion: "rgba(124,58,237,0.2)",
                  decision: "rgba(245,158,11,0.2)",
                  closing: "rgba(239,68,68,0.2)",
                };
                const borderColors: Record<string, string> = {
                  opening: "#10b981",
                  discussion: "#7c3aed",
                  decision: "#f59e0b",
                  closing: "#ef4444",
                };
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: colors[item.type] || "rgba(0,0,0,0.15)",
                      borderLeft: `4px solid ${borderColors[item.type] || "rgba(255,255,255,0.2)"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "rgba(240,245,255,0.9)" }}>
                        {i + 1}. {item.title}
                      </span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.8rem",
                        color: "rgba(200,210,230,0.6)",
                        whiteSpace: "nowrap",
                      }}>
                        {item.duration} min
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.7)", marginBottom: item.questionsToAnswer.length > 0 ? 8 : 0 }}>
                      {item.description}
                    </div>
                    {item.questionsToAnswer.length > 0 && (
                      <div style={{ fontSize: "0.8rem", color: "rgba(200,210,230,0.5)" }}>
                        <strong>Questions:</strong> {item.questionsToAnswer.join(", ")}
                      </div>
                    )}
                    {item.lead && (
                      <div style={{ fontSize: "0.78rem", color: "#c9a84c", marginTop: 4 }}>
                        ★ {item.role}: {item.lead}
                        {item.prepNotes && ` — ${item.prepNotes}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Next steps */}
            <div style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(16,185,129,0.7)", marginBottom: 4 }}>
                Next Steps
              </div>
              <div style={{ fontSize: "0.88rem", color: "rgba(240,245,255,0.85)" }}>
                {output.nextSteps}
              </div>
            </div>

            <div style={{ height: 12 }} />
            <OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : (
          <EmptyState
            icon="◇"
            title="Your agenda will appear here"
            description="Enter meeting details and click Generate Agenda."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
