"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Loader2 } from "lucide-react";
import { readResponseJson } from "@/lib/readResponseJson";
import type { PdfDocument, PdfTemplateId } from "@/lib/pdfGenerator/types";

export type ReportBuilderApiSuccess = {
  ok: true;
  document: PdfDocument;
  templateId: PdfTemplateId;
  templateLabel: string;
  documentTitle: string;
};

type ApiShape = { ok: true; text: string } | { ok: false; error: string };

type Props = {
  apiPath: string;
  body: object;
  onText: (text: string) => void;
  onReset: () => void;
  onSubmitLabel?: string;
  /** When the API returns structured report JSON (report builder v2), receive it here. */
  onReport?: (r: ReportBuilderApiSuccess) => void;
};

export function AiToolSubmitBar({
  apiPath,
  body,
  onText,
  onReset,
  onSubmitLabel = "Generate",
  onReport,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const read = await readResponseJson<ApiShape>(res);
      if (!read.ok) {
        setError(read.error);
        return;
      }
      const data = read.data as
        | ReportBuilderApiSuccess
        | { ok: true; text: string }
        | { ok: false; error?: string }
        | undefined;
      if (data && "ok" in data && !data.ok) {
        setError(typeof (data as { error?: string }).error === "string" ? (data as { error: string }).error : "Request failed");
        return;
      }
      if (data && "ok" in data && data.ok && "document" in data && data.document && onReport) {
        onReport(data as ReportBuilderApiSuccess);
        return;
      }
      if (data?.ok && "text" in data && typeof (data as { text?: string }).text === "string") {
        onText((data as { text: string }).text);
        return;
      }
      setError("Request failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ai-tools__actions">
      {error ? <p className="ai-tools__err">{error}</p> : null}
      <div className="ai-tools__btn-row">
        <button
          type="button"
          className="ai-tools__btn ai-tools__btn--primary"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="ai-tools__spin" size={18} /> : null}
          {onSubmitLabel}
        </button>
        <button type="button" className="ai-tools__btn ai-tools__btn--ghost" onClick={onReset}>
          Clear output
        </button>
      </div>
    </div>
  );
}

export function AiToolMarkdownResult({
  text,
  printId,
}: {
  text: string;
  printId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  }

  if (!text) return null;

  return (
    <div
      className="ai-tools__out"
      id={printId}
    >
      <div className="ai-tools__out-header">
        <h2 className="ai-tools__out-title">Result</h2>
        <button
          type="button"
          className="ai-tools__btn ai-tools__btn--ghost"
          onClick={copy}
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      <div className="ai-tools__markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </div>
  );
}
