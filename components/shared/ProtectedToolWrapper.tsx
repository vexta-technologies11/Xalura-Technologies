"use client";

import { ReactNode } from "react";
import { UpgradeModal } from "./UpgradeModal";
import { UsageLimitBar } from "./UsageLimitBar";
import { AntiBotPuzzle } from "@/lib/antiBot";
import { useProtectedGenerate } from "@/lib/hooks/useProtectedGenerate";

interface ProtectedToolWrapperProps {
  toolId: string;
  children: (props: {
    usage: { used: number; limit: number; isBlocked: boolean; remaining: number };
    handleGenerate: () => void;
    isProcessing: boolean;
  }) => ReactNode;
}

/**
 * Wraps any tool's form with:
 * 1. Anti-bot puzzle before every generation
 * 2. Hard minimum 5 usage limit (cross-tool tracked)
 * 3. Pro upgrade modal when limit hit
 */
export function ProtectedToolWrapper({ toolId, children }: ProtectedToolWrapperProps) {
  const {
    usage,
    handleGenerate,
    upgradeOpen,
    triggerSource,
    closeUpgrade,
    showPuzzle,
    puzzle,
    puzzleError,
    skippable,
    handlePuzzleAnswer,
    handleSkip,
    handleClosePuzzle,
  } = useProtectedGenerate({
    toolId,
    onGenerate: async () => {
      // The parent's actual generation logic is triggered by handleGenerate
    },
  });

  return (
    <>
      {/* Usage limit bar shown above the tool */}
      <UsageLimitBar used={usage.used} limit={usage.limit} label={`${toolId} today`} />

      {/* Render the child with wired-up generation handler */}
      {children({
        usage,
        handleGenerate,
        isProcessing: false,
      })}

      {/* Anti-bot puzzle overlay */}
      {showPuzzle && puzzle && (
        <AntiBotPuzzle
          puzzle={puzzle}
          puzzleError={puzzleError}
          onAnswer={handlePuzzleAnswer}
          onClose={handleClosePuzzle}
          skippable={skippable}
          onSkip={handleSkip}
        />
      )}

      {/* Upgrade modal */}
      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
