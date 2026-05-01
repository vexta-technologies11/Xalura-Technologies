"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/Toast";

interface OutputActionsProps {
  onCopy?: () => string | void;
  onExport?: () => void;
  onSave?: () => void;
  showCopy?: boolean;
  showExport?: boolean;
  showSave?: boolean;
  copyLabel?: string;
  exportLabel?: string;
}

export function OutputActions({
  onCopy,
  onExport,
  onSave,
  showCopy = true,
  showExport = true,
  showSave = true,
  copyLabel = "Copy",
  exportLabel = "Export PDF",
}: OutputActionsProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = () => {
    if (onCopy) {
      const text = onCopy();
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          showToast("Copied to clipboard", "success");
          setTimeout(() => setCopied(false), 2000);
        });
      }
    }
  };

  return (
    <div className="ai-tools__out-actions">
      {showCopy && onCopy && (
        <button
          className="ai-tools__btn ai-tools__btn--ghost"
          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
          onClick={handleCopy}
        >
          {copied ? "Copied" : copyLabel}
        </button>
      )}
      {showExport && onExport && (
        <button
          className="ai-tools__btn ai-tools__btn--ghost"
          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
          onClick={onExport}
        >
          {exportLabel}
        </button>
      )}
      {showSave && onSave && (
        <button
          className="ai-tools__btn ai-tools__btn--ghost"
          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
          onClick={onSave}
        >
          Save
        </button>
      )}
    </div>
  );
}
