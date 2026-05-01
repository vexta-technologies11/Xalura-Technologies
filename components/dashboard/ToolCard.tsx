"use client";

import Link from "next/link";
import type { ToolConfig } from "@/lib/data/tools";

interface ToolCardProps {
  tool: ToolConfig;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link
      href={tool.route}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "20px 22px",
        borderRadius: "12px",
        textDecoration: "none",
        color: "inherit",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      className="tool-card-hover"
    >
      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "3px",
          height: "100%",
          background: tool.iconColor,
          opacity: 0.6,
        }}
      />

      {/* Badge */}
      {tool.badge && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: tool.badge === "POPULAR"
              ? "linear-gradient(135deg, #7c3aed, #a855f7)"
              : "linear-gradient(135deg, #e8a838, #f59e0b)",
            color: "#fff",
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.05em",
          }}
        >
          {tool.badge}
        </div>
      )}

      {/* Icon and tier */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{tool.icon}</span>
        {tool.tier !== "free" && (
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(201,168,76,0.15)",
              color: "#c9a84c",
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          >
            STARTER+
          </span>
        )}
      </div>

      <div>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "rgba(240,245,255,0.95)" }}>
          {tool.name}
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5, color: "rgba(200,210,230,0.7)" }}>
          {tool.description}
        </p>
      </div>

      <style jsx>{`
        .tool-card-hover:hover {
          background: rgba(0, 0, 0, 0.5);
          border-color: rgba(124, 58, 237, 0.22);
          transform: translateY(-1px);
        }
      `}</style>
    </Link>
  );
}
