"use client";

import { type InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextInput({ label, error, hint, className = "", ...props }: TextInputProps) {
  return (
    <div className="ai-tools__field">
      {label && <label className="ai-tools__label">{label}</label>}
      <input
        className={`ai-tools__input ${error ? "!border-red-500/50" : ""} ${className}`}
        {...props}
      />
      {error && <p className="ai-tools__err">{error}</p>}
      {hint && !error && (
        <p style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.45)", margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
