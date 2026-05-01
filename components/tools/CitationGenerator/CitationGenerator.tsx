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
import { generateCitation, type CitationResult } from "@/lib/services/citationService";

const SOURCE_TYPES = [
  { value: "website", label: "Website" },
  { value: "book", label: "Book" },
  { value: "journal", label: "Journal Article" },
  { value: "youtube", label: "YouTube Video" },
  { value: "news", label: "News Article" },
];

const SOURCE_TYPES_PRO = [
  { value: "podcast", label: "Podcast" },
  { value: "image", label: "Image / Photo" },
  { value: "tweet", label: "Tweet / X Post" },
  { value: "lecture", label: "Lecture / Presentation" },
  { value: "interview", label: "Interview" },
  { value: "film", label: "Film / Movie" },
  { value: "patent", label: "Patent" },
  { value: "report", label: "Report / White Paper" },
];

const STYLES_FREE = [
  { value: "apa", label: "APA 7th Edition" },
  { value: "mla", label: "MLA 9th Edition" },
];

const STYLES_PRO = [
  { value: "chicago", label: "Chicago (Notes & Bibliography)" },
  { value: "harvard", label: "Harvard" },
  { value: "ieee", label: "IEEE" },
  { value: "vancouver", label: "Vancouver" },
];

export function CitationGenerator() {
  const { usage, incrementUsage } = useUsageLimit("citation-generator");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [sourceType, setSourceType] = useState("");
  const [style, setStyle] = useState("apa");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [url, setUrl] = useState("");
  const [pages, setPages] = useState("");
  const [volume, setVolume] = useState("");
  const [issue, setIssue] = useState("");
  const [doi, setDoi] = useState("");
  const [accessedDate, setAccessedDate] = useState(new Date().toISOString().split("T")[0]);
  const [institution, setInstitution] = useState("");

  // Bulk mode
  const [bulkUrls, setBulkUrls] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<CitationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSourceTypes = [...SOURCE_TYPES, ...SOURCE_TYPES_PRO];
  const allStyles = [...STYLES_FREE, ...STYLES_PRO];
  const isProStyle = STYLES_PRO.some((s) => s.value === style);
  const isProSource = SOURCE_TYPES_PRO.some((s) => s.value === sourceType);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Citation Generator");
      return;
    }
    if (isProStyle || isProSource) {
      openUpgrade("Citation Generator (Pro feature)");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateCitation({
        sourceType,
        style,
        title,
        author,
        publisher,
        year,
        url,
        pages,
        volume,
        issue,
        doi,
        accessedDate,
        institution,
        isBulk: mode === "bulk",
        urls: mode === "bulk" ? bulkUrls.split("\n").filter(Boolean) : undefined,
      });
      setOutput(result);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [sourceType, style, title, author, publisher, year, url, pages, volume, issue, doi, accessedDate, institution, mode, bulkUrls, usage.isBlocked, openUpgrade, incrementUsage, isProStyle, isProSource]);

  const allCitationsText = output
    ? output.citations.map((c) => c.formatted).join("\n\n")
    : "";

  const handleCopy = () => allCitationsText;

  return (
    <>
      <div className="ai-tools__form" style={{ maxWidth: 800, margin: "0 auto" }}>
        <UsageLimitBar used={usage.used} limit={usage.limit} label="Citations today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

        {/* Mode toggle */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}>
          <button
            className={`ai-tools__btn ${mode === "single" ? "ai-tools__btn--primary" : ""}`}
            style={{ flex: 1, minWidth: 120 }}
            onClick={() => setMode("single")}
          >
            Single Citation
          </button>
          <button
            className={`ai-tools__btn ${mode === "bulk" ? "ai-tools__btn--primary" : ""}`}
            style={{ flex: 1, minWidth: 120 }}
            onClick={() => {
              if (usage.used >= usage.limit) {
                openUpgrade("Bulk citations (Pro)");
                return;
              }
              setMode("bulk");
            }}
          >
            Bulk Mode {!usage.isBlocked ? "★ Pro" : ""}
          </button>
        </div>

        {mode === "single" ? (
          <>
            <div className="ai-tools__field-row ai-tools__field-row--2">
              <SelectInput
                label="Source Type"
                options={allSourceTypes}
                placeholder="Select source type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              />
              <SelectInput
                label="Citation Style"
                options={allStyles}
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>

            {isProSource && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.25)",
                fontSize: "0.85rem",
                color: "#c9a84c",
                marginBottom: 12,
              }}>
                ★ This source type requires a Pro subscription
              </div>
            )}
            {isProStyle && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.25)",
                fontSize: "0.85rem",
                color: "#c9a84c",
                marginBottom: 12,
              }}>
                ★ This citation style requires a Pro subscription
              </div>
            )}

            <TextInput
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article, book, or video title"
            />

            <div className="ai-tools__field-row ai-tools__field-row--2">
              <TextInput
                label="Author(s)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Last, First M."
              />
              <TextInput
                label="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
              />
            </div>

            <div className="ai-tools__field-row ai-tools__field-row--2">
              <TextInput
                label="Publisher / Journal"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Publisher name"
              />
              <TextInput
                label="URL / DOI"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="ai-tools__field-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <TextInput
                label="Volume"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="Vol."
                style={{ flex: 1, minWidth: 80 }}
              />
              <TextInput
                label="Issue"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="No."
                style={{ flex: 1, minWidth: 80 }}
              />
              <TextInput
                label="Pages"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="pp. 12-34"
                style={{ flex: 1, minWidth: 80 }}
              />
            </div>

            <div className="ai-tools__field-row ai-tools__field-row--2">
              <TextInput
                label="Accessed Date"
                type="date"
                value={accessedDate}
                onChange={(e) => setAccessedDate(e.target.value)}
              />
              <TextInput
                label="Institution (if applicable)"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="University name"
              />
            </div>
          </>
        ) : (
          <>
            <div className="ai-tools__field-row ai-tools__field-row--2">
              <SelectInput
                label="Citation Style"
                options={allStyles}
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
              <SelectInput
                label="Source Type (default)"
                options={allSourceTypes}
                placeholder="Auto-detect"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              />
            </div>

            <TextArea
              label="Sources (one per line)"
              placeholder={`https://example.com/article\nhttps://youtube.com/watch?v=...\nSmith, J. (2024). Book Title. Publisher.`}
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              rows={6}
              hint={`${bulkUrls.split("\n").filter(Boolean).length} sources`}
            />
          </>
        )}

        <div className="ai-tools__actions">
          <Button
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={
              isGenerating ||
              (mode === "single" && !sourceType) ||
              (mode === "bulk" && !bulkUrls.trim())
            }
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating..." : mode === "single" ? "Generate Citation" : "Generate All Citations"}
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
              <h3 className="ai-tools__out-title">
                {output.citations.length > 1 ? "Citations" : "Citation"}
              </h3>
              <div style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  {style.toUpperCase()}
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  {output.citations[0]?.sourceType || sourceType}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {output.citations.map((cit) => (
                <div
                  key={cit.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    color: "rgba(240,245,255,0.9)",
                    marginBottom: 6,
                  }}>
                    {cit.formatted}
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}>
                    <span style={{
                      fontSize: "0.78rem",
                      color: "rgba(200,210,230,0.5)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      In-text: {cit.inText}
                    </span>
                    <button
                      className="ai-tools__btn ai-tools__btn--ghost"
                      style={{ fontSize: "0.78rem", padding: "2px 10px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(cit.formatted);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: 12 }} />
            <OutputActions
              onCopy={handleCopy}
              showExport={false}
            />
          </>
        ) : (
          <EmptyState
            icon='"'
            title="Your citation will appear here"
            description="Fill in the source details and click Generate Citation."
          />
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
