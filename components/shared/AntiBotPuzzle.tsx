"use client";

import { useState } from "react";
import type { PuzzleConfig } from "@/lib/antiBot";

/**
 * Renders the anti-bot puzzle UI.
 */
export function AntiBotPuzzle({
  puzzle,
  puzzleError,
  onAnswer,
  onClose,
  skippable,
  onSkip,
}: {
  puzzle: PuzzleConfig;
  puzzleError: string | null;
  onAnswer: (answer: string | number) => void;
  onClose: () => void;
  skippable: boolean;
  onSkip?: () => void;
}) {
  const [mathInput, setMathInput] = useState("");

  const handleEmojiClick = (index: number) => {
    onAnswer(index);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "rgba(200,210,230,0.5)",
            marginBottom: "12px",
          }}
        >
          Are you human?
        </div>

        <p
          style={{
            color: "rgba(200,210,230,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          {puzzle.instructions}
        </p>

        {puzzle.type === "math" && (
          <div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "rgba(240,245,255,0.95)",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: "16px",
              }}
            >
              {puzzle.challenge}
            </div>
            <input
              type="number"
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mathInput.trim()) {
                  onAnswer(mathInput.trim());
                  setMathInput("");
                }
              }}
              placeholder="Your answer"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
                fontSize: "1.2rem",
                textAlign: "center",
                outline: "none",
                marginBottom: "12px",
              }}
              autoFocus
            />
            <button
              className="ai-tools__btn ai-tools__btn--primary"
              style={{ width: "100%", padding: "12px" }}
              onClick={() => {
                if (mathInput.trim()) {
                  onAnswer(mathInput.trim());
                  setMathInput("");
                }
              }}
            >
              Submit
            </button>
          </div>
        )}

        {puzzle.type === "align" && (() => {
          try {
            const data = JSON.parse(puzzle.challenge);
            const items = Array.from({ length: 6 }, (_, i) => ({
              emoji: i === data.position ? data.emoji : data.wrong,
              index: i,
            }));
            // Shuffle
            for (let i = items.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [items[i], items[j]] = [items[j], items[i]];
            }

            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                }}
              >
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    style={{
                      padding: "16px 12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      cursor: "pointer",
                      fontSize: "2rem",
                      transition: "all 0.15s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(124,58,237,0.15)";
                      e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    onClick={() => handleEmojiClick(item.index)}
                  >
                    <span>{item.emoji}</span>
                    <span style={{ fontSize: "0.6rem", color: "rgba(200,210,230,0.4)" }}>
                      {item.emoji === data.emoji ? data.label : "Decoy"}
                    </span>
                  </button>
                ))}
              </div>
            );
          } catch {
            return <div>Invalid puzzle</div>;
          }
        })()}

        {puzzleError && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "0.85rem",
              marginTop: "16px",
              fontWeight: 600,
            }}
          >
            {puzzleError}
          </p>
        )}

        {skippable && onSkip && (
          <button
            className="ai-tools__btn ai-tools__btn--ghost"
            style={{ marginTop: "16px", fontSize: "0.8rem" }}
            onClick={onSkip}
          >
            Skip (verified)
          </button>
        )}

        <button
          className="ai-tools__btn ai-tools__btn--ghost"
          style={{ marginTop: "8px", fontSize: "0.75rem", color: "rgba(200,210,230,0.4)" }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
