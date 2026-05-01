"use client";

import { type ReactNode } from "react";
import { ToastProvider } from "@/components/shared/Toast";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ToastProvider>
  );
}
