"use client";

import { useState } from "react";

interface DiffViewerProps {
  original: string;
  revised: string;
  isOpen: boolean;
  onClose: () => void;
  onAcceptAll?: () => void;
  onRevertAll?: () => void;
  title?: string;
}

export function DiffViewer({
  original,
  revised,
  isOpen,
  onClose,
  onAcceptAll,
  onRevertAll,
  title = "Changes",
}: DiffViewerProps) {
  const [view, setView] = useState<"side-by-side" | "inline">("side-by-side");

  if (!isOpen) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#0a0a0f",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#13131a",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(240,245,255,0.9)" }}>
          {title}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            className="ai-tools__btn ai-tools__btn--ghost"
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={() => setView("side-by-side")}
          >
            Side by side
          </button>
          <button
            className="ai-tools__btn ai-tools__btn--ghost"
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={() => setView("inline")}
          >
            Inline
          </button>
          {onAcceptAll && (
            <button
              className="ai-tools__btn"
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                background: "rgba(16,185,129,0.2)",
                borderColor: "rgba(16,185,129,0.3)",
                color: "#10b981",
              }}
              onClick={onAcceptAll}
            >
              Accept All
            </button>
          )}
          {onRevertAll && (
            <button
              className="ai-tools__btn ai-tools__btn--ghost"
              style={{ padding: "4px 10px", fontSize: "0.75rem", color: "#ef4444" }}
              onClick={onRevertAll}
            >
              Revert All
            </button>
          )}
          <button
            className="ai-tools__btn ai-tools__btn--ghost"
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={onClose}
          >
            X
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "side-by-side" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1px",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ padding: "16px", background: "#0a0a0f" }}>
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#ef4444",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Your Original
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: "0.85rem",
                lineHeight: 1.6,
                color: "rgba(240,245,255,0.8)",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {original}
            </pre>
          </div>
          <div style={{ padding: "16px", background: "#0a0a0f" }}>
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#10b981",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              AI Revised
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: "0.85rem",
                lineHeight: 1.6,
                color: "rgba(240,245,255,0.95)",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {revised}
            </pre>
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px", background: "#0a0a0f" }}>
          <pre
            style={{
              margin: 0,
              fontSize: "0.85rem",
              lineHeight: 1.6,
              color: "rgba(240,245,255,0.85)",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
            }}
          >
            {original.split("\n").map((line, i) => {
              const revisedLines = revised.split("\n");
              const changed = revisedLines[i] !== line;
              return (
                <span
                  key={i}
                  style={{
                    display: "block",
                    background: changed
                      ? i < revisedLines.length
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(239,68,68,0.1)"
                      : "transparent",
                    borderLeft: changed
                      ? `3px solid ${i < revisedLines.length ? "#10b981" : "#ef4444"}`
                      : "3px solid transparent",
                    padding: "1px 8px",
                  }}
                >
                  {line}
                </span>
              );
            })}
          </pre>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "0.75rem",
          color: "rgba(200,210,230,0.45)",
          textAlign: "center",
        }}
      >
        {original.split(/\s+/).length} words → {revised.split(/\s+/).length} words
      </div>
    </div>
  );
}
