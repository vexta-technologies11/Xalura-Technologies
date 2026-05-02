"use client";

import { useCallback, useState } from "react";
import { useUsageLimit } from "./useUsageLimit";
import { useUpgradeModal } from "./useUpgradeModal";
import { useAntiBot } from "@/lib/antiBot";

interface UseProtectedGenerateOptions {
  toolId: string;
  onGenerate: () => Promise<void>;
}

export function useProtectedGenerate({ toolId, onGenerate }: UseProtectedGenerateOptions) {
  const { usage, incrementUsage } = useUsageLimit(toolId);
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();
  const {
    isVerified,
    showPuzzle,
    puzzle,
    puzzleError,
    isLoading,
    requestVerification,
    attemptPuzzle,
    resetVerification,
  } = useAntiBot();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (isProcessing || isLoading) return;

    // Check usage limit first
    if (usage.isBlocked) {
      openUpgrade(toolId);
      return;
    }

    // Require anti-bot verification for EVERY generation
    if (!isVerified) {
      requestVerification();
      return;
    }

    setIsProcessing(true);
    try {
      await onGenerate();
      incrementUsage();
      // Reset anti-bot so user must re-verify for next generation
      resetVerification();
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    isLoading,
    usage.isBlocked,
    isVerified,
    toolId,
    onGenerate,
    incrementUsage,
    openUpgrade,
    requestVerification,
    resetVerification,
  ]);

  const handlePuzzleAnswer = useCallback(
    (answer: string | number) => {
      const success = attemptPuzzle(answer);
      if (success) {
        // Auto-trigger generation after verification
        handleGenerate();
      }
    },
    [attemptPuzzle, handleGenerate],
  );

  // No skip — every generation requires solving a puzzle

  return {
    usage,
    handleGenerate,
    upgradeOpen,
    triggerSource,
    closeUpgrade,
    // Anti-bot puzzle props
    showPuzzle,
    puzzle,
    puzzleError,
    isLoading,
    skippable: false,
    handlePuzzleAnswer,
    handleSkip: undefined,
    handleClosePuzzle: resetVerification,
  };
}
