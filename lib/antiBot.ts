"use client";

import { useState, useCallback, useRef } from "react";

export type PuzzleType = "align" | "captcha" | "slider" | "math";

export interface PuzzleConfig {
  type: PuzzleType;
  challenge: string;
  answer: string | number;
  instructions: string;
}

const EMOJI_ALIGN_CHALLENGES = [
  { emoji: "🚀", wrong: "🌍", label: "Rocket" },
  { emoji: "🔒", wrong: "🔓", label: "Lock" },
  { emoji: "✅", wrong: "❌", label: "Checkmark" },
  { emoji: "🌟", wrong: "💫", label: "Star" },
  { emoji: "🐱", wrong: "🐶", label: "Cat" },
  { emoji: "☀️", wrong: "🌙", label: "Sun" },
  { emoji: "❤️", wrong: "💔", label: "Heart" },
  { emoji: "👍", wrong: "👎", label: "Thumbs Up" },
];

function generatePuzzle(): PuzzleConfig {
  const pick = EMOJI_ALIGN_CHALLENGES[Math.floor(Math.random() * EMOJI_ALIGN_CHALLENGES.length)];
  const position = Math.floor(Math.random() * 6);

  if (Math.random() > 0.5) {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 9) + 2;
    const ops = ["+", "-"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    const answer = op === "+" ? a + b : a - b;
    return { type: "math" as const, challenge: `${a} ${op} ${b} = ?`, answer: String(answer), instructions: "Solve this simple math problem:" };
  }

  return {
    type: "align" as const,
    challenge: JSON.stringify({ emoji: pick.emoji, wrong: pick.wrong, position, label: pick.label }),
    answer: String(position),
    instructions: `Tap the "${pick.label}" (${pick.emoji}) button below:`,
  };
}

export function useAntiBot() {
  const [puzzle, setPuzzle] = useState<PuzzleConfig | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const verificationIdRef = useRef<string | null>(null);

  const requestVerification = useCallback(() => {
    setPuzzle(generatePuzzle());
    setShowPuzzle(true);
    setIsVerified(false);
    setPuzzleError(null);
    verificationIdRef.current = crypto.randomUUID();
  }, []);

  const attemptPuzzle = useCallback(
    (answer: string | number) => {
      if (!puzzle) return false;
      if (String(answer).trim() === String(puzzle.answer).trim()) {
        setIsVerified(true);
        setShowPuzzle(false);
        setPuzzle(null);
        setPuzzleError(null);
        setSolvedCount((c) => c + 1);
        return true;
      } else {
        setPuzzleError("Incorrect. Try again.");
        setTimeout(() => { setPuzzle(generatePuzzle()); setPuzzleError(null); }, 800);
        return false;
      }
    },
    [puzzle],
  );

  const resetVerification = useCallback(() => {
    setIsVerified(false);
    setShowPuzzle(false);
    setPuzzle(null);
    setPuzzleError(null);
    verificationIdRef.current = null;
  }, []);

  return {
    isVerified,
    showPuzzle,
    puzzle,
    puzzleError,
    skippable: solvedCount >= 3,
    requestVerification,
    attemptPuzzle,
    resetVerification,
  };
}
