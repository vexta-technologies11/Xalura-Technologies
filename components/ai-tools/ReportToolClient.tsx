"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Printer, Copy, Check } from "lucide-react";
import { PdfDocumentView } from "./PdfDocumentView";
import { AiToolSubmitBar, type ReportBuilderApiSuccess } from "./AiToolResultPanel";
import { AiToolSelect, AiToolMainRequest } from "./aiToolFields";
import { TONE_OPTIONS, REPORT_TYPE_OPTIONS, REPORT_LENGTH_OPTIONS } from "@/lib/aiToolFormConfig";
import { documentToPlainText } from "@/lib/pdfGenerator/documentToPlainText";

const toneVals = TONE_OPTIONS.map((t) => ({ value: t, label: t }));
const rtypeVals = REPORT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }));

export function ReportToolClient() {
  const [title, setTitle] = useState("");
  const [request, setRequest] = useState("");
  const [reportType, setReportType] = useState<string>(REPORT_TYPE_OPTIONS[0]);
  const [tone, setTone] = useState<string>(TONE_OPTIONS[0]);
  const [length, setLength] = useState<string>(REPORT_LENGTH_OPTIONS[1].value);
  const [out, setOut] = useState<ReportBuilderApiSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  const body = { request, title, reportType, tone, length };

  const onReset = useCallback(() => {
    setOut(null);
  }, []);

  const onReport = useCallback((r: ReportBuilderApiSuccess) => {
    setOut(r);
  }, []);

  return (
    <div className="ai-tools__grid">
      <div className="ai-tools__col">
        <Link className="ai-tools__back ai-tools__no-print" href="/ai-tools">
          ← All everyday tools
        </Link>
        <form className="ai-tools__form ai-tools__no-print" onSubmit={(e) => e.preventDefault()} autoComplete="off">
          <label className="ai-tools__field">
            <span className="ai-tools__label">Title (optional)</span>
            <input
              className="ai-tools__input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shown in the document header; if empty, the first line of your notes is used"
            />
          </label>
          <AiToolMainRequest
            label="What you need"
            value={request}
            onChange={setRequest}
            placeholder="Add bullets, data, or a rough outline. We return a polished layout (no # markdown noise) ready to print or save as PDF."
            minRows={7}
          />
          <div className="ai-tools__field-row ai-tools__field-row--3">
            <AiToolSelect
              label="Document type"
              value={reportType}
              onChange={setReportType}
              options={rtypeVals}
            />
            <AiToolSelect label="Tone" value={tone} onChange={setTone} options={toneVals} />
            <AiToolSelect label="Length" value={length} onChange={setLength} options={REPORT_LENGTH_OPTIONS} />
          </div>
          <p style={{ fontSize: "0.88rem", opacity: 0.86, margin: 0, lineHeight: 1.45 }}>
            <strong>Auto (from your notes)</strong> infers invoice, data, guide, and technical layouts. The model returns structured content; the page
            applies one of ten print templates.
          </p>
          <AiToolSubmitBar
            apiPath="/api/ai-tools/report"
            body={body}
            onText={() => {}}
            onReport={onReport}
            onReset={onReset}
            onSubmitLabel="Generate report"
          />
        </form>
        {out ? (
          <div className="ai-tools__report-extras ai-tools__no-print">
            <button
              type="button"
              className="ai-tools__btn ai-tools__btn--ghost"
              onClick={() => {
                const t = (title.trim() || out.documentTitle || "Report").slice(0, 80);
                document.title = t;
                window.print();
              }}
            >
              <Printer size={16} />
              Print / save as PDF
            </button>
          </div>
        ) : null}
      </div>
      {out ? (
        <div className="ai-tools__out" id="ai-tools-print-root">
          <div className="ai-tools__out-header ai-tools__no-print">
            <h2 className="ai-tools__out-title">Result</h2>
            <div className="ai-tools__out-actions">
              <button
                type="button"
                className="ai-tools__btn ai-tools__btn--ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(documentToPlainText(out.document));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2_000);
                }}
                title="Copy plain text"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy text"}
              </button>
            </div>
          </div>
          <PdfDocumentView
            document={out.document}
            templateId={out.templateId}
            templateLabel={out.templateLabel}
            printId="pdf-doc-print"
          />
        </div>
      ) : null}
    </div>
  );
}
