"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getDailyUsage,
  incrementDailyUsage,
  getCooldownRemaining,
  formatCooldown,
} from "@/lib/usageStore";

interface UsageInfo {
  used: number;
  limit: number;
  isBlocked: boolean;
  remaining: number;
  cooldownMs: number;
  cooldownLabel: string;
}

const POLL_INTERVAL = 5_000; // Poll every 5s to sync across tabs
/**
 * Usage limit hook with 24-hour cooldown.
 *
 * - Free users: 15 generations/day (24h rolling window)
 * - Admin users: Unlimited (detected via localStorage flag)
 * - Survives page refreshes (persisted in localStorage)
 * - Cross-tab sync via polling
 */
export function useUsageLimit(toolId: string) {
  const [usage, setUsage] = useState<UsageInfo>(() => {
    const daily = getDailyUsage();
    const cooldownMs = getCooldownRemaining();
    return {
      ...daily,
      cooldownMs,
      cooldownLabel: formatCooldown(cooldownMs),
    };
  });

  const prevToolRef = useRef<string | null>(null);

  // Sync from storage every 5s (catches other tabs and refreshes)
  useEffect(() => {
    const interval = setInterval(() => {
      const daily = getDailyUsage();
      const cooldownMs = getCooldownRemaining();
      setUsage((prev) => {
        if (
          prev.used !== daily.used ||
          prev.isBlocked !== daily.isBlocked ||
          prev.cooldownMs !== cooldownMs
        ) {
          return {
            ...daily,
            cooldownMs,
            cooldownLabel: formatCooldown(cooldownMs),
          };
        }
        return prev;
      });
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Detect tool transfer (cross-tool counting)
  useEffect(() => {
    if (prevToolRef.current && prevToolRef.current !== toolId) {
      // Switching tools counts as a generation
      const daily = incrementDailyUsage();
      const cooldownMs = getCooldownRemaining();
      setUsage({
        ...daily,
        cooldownMs,
        cooldownLabel: formatCooldown(cooldownMs),
      });
    }
    prevToolRef.current = toolId;
  }, [toolId]);

  const incrementUsage = useCallback(() => {
    const daily = incrementDailyUsage();
    const cooldownMs = getCooldownRemaining();
    setUsage({
      ...daily,
      cooldownMs,
      cooldownLabel: formatCooldown(cooldownMs),
    });
  }, []);

  const refresh = useCallback(() => {
    const daily = getDailyUsage();
    const cooldownMs = getCooldownRemaining();
    setUsage({
      ...daily,
      cooldownMs,
      cooldownLabel: formatCooldown(cooldownMs),
    });
  }, []);

  return { usage, incrementUsage, refresh };
}

