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
import { generateLetter, type LetterParams, type LetterOutput } from "@/lib/services/letterService";

const CATEGORIES = [
  { value: "complaint", label: "Complaint" },
  { value: "request", label: "Request" },
  { value: "appeal", label: "Appeal" },
  { value: "personal", label: "Personal" },
  { value: "formal-business", label: "Formal Business" },
  { value: "residential", label: "Residential" },
  { value: "employment", label: "Employment" },
  { value: "school", label: "School / Education" },
];

const SUB_TYPES: Record<string, { value: string; label: string }[]> = {
  complaint: [
    { value: "company", label: "To a Company" },
    { value: "landlord", label: "To a Landlord" },
    { value: "neighbor", label: "To a Neighbor" },
    { value: "school-c", label: "To a School" },
    { value: "government", label: "To Government" },
  ],
  request: [
    { value: "info", label: "Information Request" },
    { value: "accommodation", label: "Accommodation Request" },
    { value: "extension", label: "Extension Request" },
    { value: "refund", label: "Refund Request" },
  ],
  appeal: [
    { value: "decision", label: "Decision Appeal" },
    { value: "fine", label: "Fine Appeal" },
    { value: "insurance", label: "Insurance Appeal" },
    { value: "academic", label: "Academic Appeal" },
  ],
  personal: [
    { value: "thank-you", label: "Thank You" },
    { value: "congratulations", label: "Congratulations" },
    { value: "condolences", label: "Condolences" },
    { value: "apology", label: "Apology" },
    { value: "reconnection", label: "Reconnection" },
  ],
  "formal-business": [
    { value: "introduction", label: "Introduction" },
    { value: "partnership", label: "Partnership Proposal" },
    { value: "inquiry", label: "Service Inquiry" },
    { value: "reference", label: "Reference Request" },
  ],
  residential: [
    { value: "complaint-r", label: "Landlord Complaint" },
    { value: "lease", label: "Lease Termination" },
    { value: "maintenance", label: "Maintenance Request" },
    { value: "deposit", label: "Security Deposit" },
  ],
  employment: [
    { value: "resignation", label: "Resignation" },
    { value: "reference-e", label: "Reference Request" },
    { value: "inquiry-e", label: "Job Inquiry" },
    { value: "salary", label: "Salary Negotiation" },
  ],
  school: [
    { value: "absence", label: "Absence Note" },
    { value: "grade-appeal", label: "Grade Appeal" },
    { value: "enrollment", label: "Enrollment Inquiry" },
    { value: "parent", label: "Parent Communication" },
  ],
};

const TONES = [
  { value: "polite", label: "Polite" },
  { value: "firm", label: "Firm" },
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
];

const LENGTHS = [
  { value: "brief", label: "Brief (1 paragraph)" },
  { value: "standard", label: "Standard (2-3 paragraphs)" },
  { value: "detailed", label: "Detailed (4+ paragraphs)" },
];

const COMPLEXITY = [
  { value: "simple", label: "Simple (ESL-friendly)" },
  { value: "standard", label: "Standard" },
  { value: "professional", label: "Professional" },
];

export function LetterWriter() {
  const { usage, incrementUsage } = useUsageLimit("letter");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [category, setCategory] = useState("");
  const [subType, setSubType] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientTitle, setRecipientTitle] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [subject, setSubject] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([""]);
  const [tone, setTone] = useState<LetterParams["tone"]>("polite");
  const [length, setLength] = useState<LetterParams["length"]>("standard");
  const [complexity, setComplexity] = useState<LetterParams["complexity"]>("standard");

  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<LetterOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentSubTypes = SUB_TYPES[category] || [];

  const handleKeyPointChange = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    // Always keep an empty input at the end for adding new points
    if (value && index === updated.length - 1) {
      updated.push("");
    }
    // Filter out empty entries except the last one
    const filtered = updated.filter((kp, i) => kp || i === updated.length - 1);
    setKeyPoints(filtered);
  };

  const removeKeyPoint = (index: number) => {
    if (keyPoints.length > 1) {
      setKeyPoints(keyPoints.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Letter Writer");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateLetter({
        category,
        subType,
        senderName,
        senderAddress,
        recipientName,
        recipientTitle,
        recipientCompany,
        date,
        subject,
        keyPoints: keyPoints.filter(Boolean),
        tone,
        length,
        complexity,
      });
      setOutput(result);
      incrementUsage();
    } catch (err) {
      setError("Something went wrong generating your letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [category, subType, senderName, senderAddress, recipientName, recipientTitle, recipientCompany, date, subject, keyPoints, tone, length, complexity, usage.isBlocked, openUpgrade, incrementUsage]);

  const letterText = output
    ? `${output.salutation}\n\n${output.body}\n\n${output.closing},\n${output.printedName}`
    : "";

  const handleCopy = () => letterText;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && output) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Letter - ${output.suggestedSubject}</title>
            <style>
              body { font-family: 'Georgia', serif; padding: 2in 1in; max-width: 7in; margin: 0 auto; line-height: 1.6; }
              .salutation { margin-bottom: 1em; }
              .body { white-space: pre-wrap; }
              .closing { margin-top: 2em; }
              .badge { font-size: 10px; color: #999; text-align: center; margin-top: 1in; border-top: 1px solid #ddd; padding-top: 0.5in; }
            </style>
          </head>
          <body>
            <div class="salutation">${output.salutation}</div>
            <div class="body">${output.body}</div>
            <div class="closing">${output.closing},<br>${output.printedName}</div>
            <div class="badge">REVISED BY AI — Review before sending</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <>
      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Letters today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            <SelectInput
              label="Category"
              options={CATEGORIES}
              placeholder="Select letter type"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubType("");
              }}
            />

            {category && (
              <SelectInput
                label="Sub-type"
                options={currentSubTypes}
                placeholder="Select sub-type"
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
              />
            )}

            <TextInput
              label="Your name (optional)"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="John Doe"
            />

            <TextInput
              label="Your address (optional)"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              placeholder="123 Main St, City, Country"
            />

            <div className="ai-tools__field-row">
              <TextInput
                label="Recipient name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Smith"
              />
              <SelectInput
                label="Title"
                options={[
                  { value: "Mr.", label: "Mr." },
                  { value: "Ms.", label: "Ms." },
                  { value: "Mrs.", label: "Mrs." },
                  { value: "Dr.", label: "Dr." },
                  { value: "Prof.", label: "Prof." },
                  { value: "Manager", label: "Manager" },
                  { value: "Director", label: "Director" },
                ]}
                value={recipientTitle}
                onChange={(e) => setRecipientTitle(e.target.value)}
                placeholder="Title"
              />
            </div>

            <TextInput
              label="Company / Organization"
              value={recipientCompany}
              onChange={(e) => setRecipientCompany(e.target.value)}
              placeholder="Acme Corp (optional)"
            />

            <div className="ai-tools__field-row">
              <TextInput
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <TextInput
                label="Subject / Re:"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Re: Subject"
              />
            </div>

            <div className="ai-tools__field">
              <label className="ai-tools__label">Key points (what to say)</label>
              {keyPoints.map((kp, i) => (
                <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input
                    className="ai-tools__input"
                    style={{ flex: 1, minHeight: "36px", padding: "8px 10px" }}
                    value={kp}
                    onChange={(e) => handleKeyPointChange(i, e.target.value)}
                    placeholder={`Point ${i + 1}`}
                  />
                  {i < keyPoints.length - 1 && (
                    <button
                      className="ai-tools__btn ai-tools__btn--ghost"
                      style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                      onClick={() => removeKeyPoint(i)}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="ai-tools__field-row ai-tools__field-row--3">
              <SelectInput
                label="Tone"
                options={TONES}
                value={tone}
                onChange={(e) => setTone(e.target.value as LetterParams["tone"])}
              />
              <SelectInput
                label="Length"
                options={LENGTHS}
                value={length}
                onChange={(e) => setLength(e.target.value as LetterParams["length"])}
              />
              <SelectInput
                label="Complexity"
                options={COMPLEXITY}
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as LetterParams["complexity"])}
              />
            </div>

            <div className="ai-tools__actions">
              <Button
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                disabled={!category || !recipientName || isGenerating}
                onClick={handleGenerate}
              >
                Generate Letter
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
                  <h3 className="ai-tools__out-title">Your Letter</h3>
                  <div
                    style={{
                      background: "#c9a84c20",
                      border: "1px solid #c9a84c40",
                      borderRadius: "6px",
                      padding: "3px 10px",
                      fontSize: "0.7rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: "#c9a84c",
                    }}
                  >
                    REVISED BY AI
                  </div>
                </div>

                {/* Paper Preview */}
                <div
                  style={{
                    background: "#f5f1ea",
                    color: "#1a1a2e",
                    padding: "2rem 2.2rem",
                    borderRadius: "4px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: "0.95rem",
                    lineHeight: 1.7,
                    maxWidth: "100%",
                    marginBottom: "16px",
                  }}
                >
                  {senderAddress && (
                    <div style={{ textAlign: "right", marginBottom: "1.5rem", fontSize: "0.88rem", color: "#333" }}>
                      {senderAddress}
                      <br />
                      {date}
                    </div>
                  )}
                  <div style={{ marginBottom: "1rem", color: "#333" }}>
                    {output.salutation}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#1a1a2e", marginBottom: "1.5rem" }}>
                    {output.body}
                  </div>
                  <div style={{ color: "#333" }}>
                    {output.closing},
                    <br />
                    <span style={{ fontWeight: 600 }}>{output.printedName}</span>
                  </div>
                  <div
                    style={{
                      marginTop: "2rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.7rem",
                      textAlign: "center",
                      color: "#999",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    REVISED BY AI — Review before sending
                  </div>
                </div>

                <OutputActions
                  onCopy={handleCopy}
                  onExport={handlePrint}
                  exportLabel="Print"
                />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your letter will appear here"
                description="Fill in the form and click 'Generate Letter' to see your professionally formatted letter."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
