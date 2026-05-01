"use client";

import { type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
  maxLength?: number;
}

export function TextArea({
  label,
  error,
  hint,
  showCount,
  maxLength,
  value,
  className = "",
  ...props
}: TextAreaProps) {
  const charCount = typeof value === "string" ? value.length : 0;

  return (
    <div className="ai-tools__field">
      {label && <label className="ai-tools__label">{label}</label>}
      <textarea
        className={`ai-tools__input min-h-[120px] ${error ? "!border-red-500/50" : ""} ${className}`}
        value={value}
        maxLength={maxLength}
        {...props}
      />
      {showCount && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: maxLength && charCount > maxLength * 0.9 ? "#f59e0b" : "rgba(200,210,230,0.45)",
          }}
        >
          <span>{props.placeholder || ""}</span>
          <span>
            {charCount}
            {maxLength ? ` / ${maxLength}` : ""}
          </span>
        </div>
      )}
      {error && <p className="ai-tools__err">{error}</p>}
      {hint && !error && (
        <p style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.45)", margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
