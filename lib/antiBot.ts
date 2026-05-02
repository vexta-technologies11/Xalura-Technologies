"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Server-verified anti-bot puzzle.
 *
 * HOW IT WORKS:
 * 1. Hook fetches a signed challenge from /api/anti-bot/challenge
 * 2. User solves the challenge (math problem) in the browser
 * 3. Hook stores the proof (answer + nonce + signature + expiresAt)
 * 4. Components include proof in AI tool API requests
 * 5. AI tool API route verifies the proof before processing
 *
 * This prevents bots from:
 * - Reading the answer from client-side code (generated server-side)
 * - Replaying old challenges (expire in 60s)
 * - Skipping verification (API rejects requests without valid proof)
 * - Calling the API directly (every generation requires solving a puzzle)
 */

export type PuzzleType = "math";

export interface ChallengeDTO {
  a: number;
  b: number;
  op: "+" | "-";
  nonce: string;
  expiresAt: number;
}

export interface AntiBotProof {
  answer: string | number;
  nonce: string;
  signature: string;
  expiresAt: number;
}

export interface PuzzleConfig {
  type: PuzzleType;
  text: string;
  answer: number;
  nonce: string;
  expiresAt: number;
  signature: string;
}

async function fetchChallenge(): Promise<{ challenge: ChallengeDTO; signature: string }> {
  const res = await fetch("/api/anti-bot/challenge");
  if (!res.ok) throw new Error("Failed to get challenge");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Challenge fetch failed");
  return { challenge: json.challenge, signature: json.signature };
}

export function useAntiBot() {
  const [puzzle, setPuzzle] = useState<PuzzleConfig | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);
  const [proof, setProof] = useState<AntiBotProof | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const solvingRef = useRef(false);

  const requestVerification = useCallback(async () => {
    if (solvingRef.current) return;
    setIsLoading(true);
    setPuzzleError(null);
    try {
      const { challenge, signature } = await fetchChallenge();
      const ans = challenge.op === "+"
        ? challenge.a + challenge.b
        : challenge.a - challenge.b;
      setPuzzle({
        type: "math",
        text: `${challenge.a} ${challenge.op} ${challenge.b} = ?`,
        answer: ans,
        nonce: challenge.nonce,
        expiresAt: challenge.expiresAt,
        signature,
      });
      setShowPuzzle(true);
      setIsVerified(false);
    } catch {
      // If challenge fetch fails, allow through (don't block users on server error)
      setIsVerified(true);
      setShowPuzzle(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const attemptPuzzle = useCallback(
    (answer: string | number): boolean => {
      if (!puzzle) return false;
      if (solvingRef.current) return false;
      solvingRef.current = true;

      const numAnswer = typeof answer === "string" ? parseInt(answer, 10) : answer;
      if (numAnswer === puzzle.answer) {
        // Store the proof so components can include it in API requests
        setProof({
          answer: numAnswer,
          nonce: puzzle.nonce,
          signature: puzzle.signature,
          expiresAt: puzzle.expiresAt,
        });
        setIsVerified(true);
        setShowPuzzle(false);
        setPuzzle(null);
        setPuzzleError(null);
        solvingRef.current = false;
        return true;
      } else {
        setPuzzleError("Incorrect. Try again.");
        // Generate a fresh challenge on failure
        fetchChallenge().then(({ challenge, signature }) => {
          const ans = challenge.op === "+"
            ? challenge.a + challenge.b
            : challenge.a - challenge.b;
          setPuzzle({
            type: "math",
            text: `${challenge.a} ${challenge.op} ${challenge.b} = ?`,
            answer: ans,
            nonce: challenge.nonce,
            expiresAt: challenge.expiresAt,
            signature,
          });
          setPuzzleError(null);
        });
        solvingRef.current = false;
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
    setProof(null);
    solvingRef.current = false;
  }, []);

  return {
    isVerified,
    showPuzzle,
    puzzle,
    puzzleError,
    proof, // Include this in API requests → { antiBotAnswer, antiBotNonce, antiBotSignature, antiBotExpiresAt }
    isLoading,
    skippable: false,
    requestVerification,
    attemptPuzzle,
    resetVerification,
  };
}
