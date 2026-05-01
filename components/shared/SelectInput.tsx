"use client";

import { type SelectHTMLAttributes } from "react";

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectInput({
  label,
  error,
  options,
  placeholder,
  className = "",
  ...props
}: SelectInputProps) {
  return (
    <div className="ai-tools__field">
      {label && <label className="ai-tools__label">{label}</label>}
      <select
        className={`ai-tools__input ai-tools__select ${error ? "!border-red-500/50" : ""} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="ai-tools__err">{error}</p>}
    </div>
  );
}
