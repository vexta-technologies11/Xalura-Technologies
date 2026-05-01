"use client";

import { useState, useCallback } from "react";

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerSource, setTriggerSource] = useState<string | null>(null);

  const openUpgrade = useCallback((source?: string) => {
    setTriggerSource(source || null);
    setIsOpen(true);
  }, []);

  const closeUpgrade = useCallback(() => {
    setIsOpen(false);
    setTriggerSource(null);
  }, []);

  return { isOpen, triggerSource, openUpgrade, closeUpgrade };
}
