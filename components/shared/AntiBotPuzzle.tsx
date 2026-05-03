"use client";

import { useState } from "react";
import type { PuzzleConfig } from "@/lib/antiBot";

/**
 * Renders the server-verified anti-bot puzzle.
 * Only renders math puzzles (emoji puzzles removed — they bypassed server verification).
 * Solved once per session — no re-puzzle on every generation.
 */
export function AntiBotPuzzle({
  puzzle,
  puzzleError,
  onAnswer,
  onClose,
}: {
  puzzle: PuzzleConfig;
  puzzleError: string | null;
  onAnswer: (answer: string | number) => void;
  onClose: () => void;
}) {
  const [mathInput, setMathInput] = useState("");

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
          Verify you&apos;re human
        </div>

        <p
          style={{
            color: "rgba(200,210,230,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Solve this math problem to continue. Required once per session.
        </p>

        <div
          style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "rgba(240,245,255,0.95)",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: "16px",
              }}
            >
          {puzzle.text}
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

        {/* No skip button — puzzle required once per session */}
        <button
          className="ai-tools__btn ai-tools__btn--ghost"
          style={{ marginTop: "16px", fontSize: "0.75rem", color: "rgba(200,210,230,0.4)" }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

