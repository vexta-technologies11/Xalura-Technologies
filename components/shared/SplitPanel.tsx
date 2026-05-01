"use client";

import { type ReactNode } from "react";

interface SplitPanelProps {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  leftClassName?: string;
  rightClassName?: string;
  className?: string;
}

export function SplitPanel({
  left,
  right,
  leftLabel,
  rightLabel,
  leftClassName = "",
  rightClassName = "",
  className = "",
}: SplitPanelProps) {
  return (
    <div className={`ai-tools__grid ${className}`}>
      <div className={`ai-tools__col ${leftClassName}`}>
        {leftLabel && <div className="ai-tools__label">{leftLabel}</div>}
        {left}
      </div>
      <div className={`ai-tools__col ${rightClassName}`}>
        {rightLabel && <div className="ai-tools__label">{rightLabel}</div>}
        {right}
      </div>
    </div>
  );
}
