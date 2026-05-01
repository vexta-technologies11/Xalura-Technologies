"use client";

import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "◈", title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "rgba(240,245,255,0.9)" }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(200,210,230,0.6)", maxWidth: 360 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </div>
  );
}
