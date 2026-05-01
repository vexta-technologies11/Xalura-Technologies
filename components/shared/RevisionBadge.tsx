"use client";

interface RevisionBadgeProps {
  variant?: "revised" | "enhanced" | "optimized" | "translated";
  target?: string;
  showDiff?: boolean;
  onToggleDiff?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

const badgeLabels: Record<string, string> = {
  revised: "REVISED BY AI",
  enhanced: "ENHANCED BY AI",
  optimized: "OPTIMIZED FOR",
  translated: "TRANSLATED & REVISED",
};

const badgeColors: Record<string, string> = {
  revised: "#c9a84c",
  enhanced: "#7c3aed",
  optimized: "#10b981",
  translated: "#06b6d4",
};

export function RevisionBadge({
  variant = "revised",
  target,
  showDiff,
  onToggleDiff,
  removable,
  onRemove,
}: RevisionBadgeProps) {
  const label = badgeLabels[variant];
  const color = badgeColors[variant];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: `${color}20`,
        border: `1px solid ${color}40`,
        borderRadius: "6px",
        padding: "3px 10px",
        fontSize: "0.7rem",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        letterSpacing: "0.06em",
        color: color,
        cursor: onToggleDiff ? "pointer" : "default",
        position: "relative",
      }}
      title="This document was processed and rewritten by AI based on your parameters"
      onClick={onToggleDiff}
    >
      <span style={{ fontSize: "0.6rem", opacity: 0.8 }}>◈</span>
      {label}
      {target && ` ${target}`}
      {showDiff !== undefined && (
        <span style={{ marginLeft: "4px", fontSize: "0.65rem", opacity: 0.6 }}>
          {showDiff ? "▲" : "▼"}
        </span>
      )}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: "none",
            border: "none",
            color,
            cursor: "pointer",
            padding: "0 0 0 4px",
            fontSize: "0.75rem",
            opacity: 0.6,
          }}
                    aria-label="Remove badge"
          >
            X
          </button>
      )}
    </div>
  );
}
