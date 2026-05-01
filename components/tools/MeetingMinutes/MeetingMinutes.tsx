"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { TextArea } from "@/components/shared/TextArea";
import { UploadZone } from "@/components/shared/UploadZone";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { generateMeetingMinutes, type MeetingMinutesResult } from "@/lib/services/meetingMinutesService";

export function MeetingMinutes() {
  const { usage, incrementUsage } = useUsageLimit("meeting-minutes");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [rawNotes, setRawNotes] = useState("");
  const [useProFeatures, setUseProFeatures] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<MeetingMinutesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileParsed = (result: { text: string; wordCount: number }) => {
    setRawNotes(result.text);
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Meeting Minutes");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateMeetingMinutes({
        rawNotes,
        isPro: useProFeatures,
      });
      setOutput(result);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [rawNotes, useProFeatures, usage.isBlocked, openUpgrade, incrementUsage]);

  const formattedMinutes = output
    ? `Meeting: ${output.meetingTitle}\nDate: ${output.date}\nAttendees: ${output.attendees.join(", ")}\n\nSummary:\n${output.summary}\n\nDecisions:\n${output.decisions.map((d) => `• ${d.decision} (${d.decidedBy})`).join("\n")}\n\nAction Items:\n${output.actionItems.map((a) => `• ${a.task} — ${a.owner} (${a.status})`).join("\n")}`
    : "";

  const handleCopy = () => formattedMinutes;

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Minutes today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        <TextArea
          label="Paste raw meeting notes"
          placeholder="Paste your raw conversation notes, bullet points, or transcript..."
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
          label="Upload meeting notes file"
          sublabel="Supports .txt, .md, .pdf, .docx"
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
            <strong>Enable Pro features</strong> — Priority levels, agenda mapping
          </div>
        </div>

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={rawNotes.split(/\s+/).filter(Boolean).length < 10 || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating..." : "Generate Minutes"}
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
                  {output.date}
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  {output.attendees.length} attendees
                </span>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              padding: "14px 16px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: 4 }}>
                Summary
              </div>
              <div style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "rgba(240,245,255,0.85)" }}>
                {output.summary}
              </div>
            </div>

            {/* Decisions */}
            {output.decisions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(245,158,11,0.7)", marginBottom: 8 }}>
                  Decisions Made
                </div>
                {output.decisions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 6,
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.15)",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "rgba(240,245,255,0.9)", marginBottom: 2 }}>
                      {d.decision}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.6)" }}>
                      {d.rationale} — <strong>{d.decidedBy}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Items */}
            {output.actionItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(16,185,129,0.7)", marginBottom: 8 }}>
                  Action Items
                </div>
                <div style={{
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                    minWidth: 500,
                  }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(200,210,230,0.5)", fontWeight: 500 }}>Task</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(200,210,230,0.5)", fontWeight: 500 }}>Owner</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(200,210,230,0.5)", fontWeight: 500 }}>Due</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(200,210,230,0.5)", fontWeight: 500 }}>Status</th>
                        {output.actionItems[0]?.priority && <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(200,210,230,0.5)", fontWeight: 500 }}>Priority</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {output.actionItems.map((a) => (
                        <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "8px 10px", color: "rgba(240,245,255,0.85)" }}>{a.task}</td>
                          <td style={{ padding: "8px 10px", color: "rgba(200,210,230,0.7)" }}>{a.owner}</td>
                          <td style={{ padding: "8px 10px", color: "rgba(200,210,230,0.7)" }}>{a.dueDate || "—"}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{
                              padding: "1px 6px",
                              borderRadius: 3,
                              fontSize: "0.72rem",
                              background: a.status === "Complete" ? "rgba(16,185,129,0.15)" : a.status === "In Progress" ? "rgba(245,158,11,0.15)" : "rgba(200,210,230,0.1)",
                              color: a.status === "Complete" ? "#34d399" : a.status === "In Progress" ? "#f59e0b" : "rgba(200,210,230,0.5)",
                            }}>
                              {a.status}
                            </span>
                          </td>
                          {a.priority && (
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{
                                padding: "1px 6px",
                                borderRadius: 3,
                                fontSize: "0.72rem",
                                background: a.priority === "High" ? "rgba(239,68,68,0.15)" : a.priority === "Medium" ? "rgba(245,158,11,0.15)" : "rgba(200,210,230,0.1)",
                                color: a.priority === "High" ? "#ef4444" : a.priority === "Medium" ? "#f59e0b" : "rgba(200,210,230,0.5)",
                              }}>
                                {a.priority}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Key Points */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 8 }}>
                Key Points
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {output.keyPoints.map((kp, i) => (
                  <li key={i} style={{
                    padding: "6px 0",
                    fontSize: "0.88rem",
                    color: "rgba(200,210,230,0.75)",
                    display: "flex",
                    gap: 8,
                  }}>
                    <span style={{ color: "#7c3aed" }}>•</span>
                    {kp}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ height: 12 }} />
            <OutputActions onCopy={handleCopy} showExport={false} />
          </>
        ) : (
          <EmptyState
            icon="◇"
            title="Your meeting minutes will appear here"
            description="Paste your raw notes and click Generate Minutes."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
