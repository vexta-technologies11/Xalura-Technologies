"use client";

import { useState, useCallback } from "react";

interface UsageInfo {
  used: number;
  limit: number;
  isBlocked: boolean;
  remaining: number;
}

const MOCK_LIMITS: Record<string, number> = {
  free: 5,
  starter: 30,
  pro: 200,
};

let globalUsage: Record<string, number> = {};

export function useUsageLimit(toolId: string, tier: string = "free") {
  const [usage, setUsage] = useState<UsageInfo>(() => {
    const limit = MOCK_LIMITS[tier] || 5;
    const used = globalUsage[toolId] || 0;
    return { used, limit, isBlocked: used >= limit, remaining: Math.max(0, limit - used) };
  });

  const incrementUsage = useCallback(() => {
    globalUsage[toolId] = (globalUsage[toolId] || 0) + 1;
    const limit = MOCK_LIMITS[tier] || 5;
    const used = globalUsage[toolId];
    setUsage({ used, limit, isBlocked: used >= limit, remaining: Math.max(0, limit - used) });
  }, [toolId, tier]);

  const resetUsage = useCallback(() => {
    globalUsage[toolId] = 0;
    const limit = MOCK_LIMITS[tier] || 5;
    setUsage({ used: 0, limit, isBlocked: false, remaining: limit });
  }, [toolId, tier]);

  return { usage, incrementUsage, resetUsage };
}
