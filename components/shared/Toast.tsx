"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors: Record<ToastType, string> = {
    success: "#10b981",
    error: "#ef4444",
    info: "#7c3aed",
  };

  return (
    <div
      className="animate-slide-up"
      style={{
        padding: "12px 18px",
        borderRadius: "10px",
        background: "#13131a",
        border: `1px solid ${colors[toast.type]}40`,
        borderLeft: `3px solid ${colors[toast.type]}`,
        color: "rgba(240,245,255,0.95)",
        fontSize: "0.88rem",
        maxWidth: 360,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
      }}
      onClick={() => onDismiss(toast.id)}
    >
      <span>
        {toast.type === "success" ? "•" : toast.type === "error" ? "X" : "i"}
      </span>
      {toast.message}
    </div>
  );
}
