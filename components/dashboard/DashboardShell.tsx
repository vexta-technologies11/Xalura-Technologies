"use client";

import { useState, useEffect, useCallback } from "react";
import { ToolCard } from "@/components/dashboard/ToolCard";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { TOOLS } from "@/lib/data/tools";

const MOST_USED = ["letter", "summarizer", "captions"];

export function DashboardShell() {
  // Track aggregate usage across all tools
  const [totalUsage, setTotalUsage] = useState(0);
  const [recentOutputs, setRecentOutputs] = useState<
    { toolId: string; toolName: string; toolIcon: string; preview: string; date: string }[]
  >([]);

  const tools = TOOLS;

  const totalLimit = tools.length * 5;

  useEffect(() => {
    // Simulate some usage
    const used = Math.floor(Math.random() * 15);
    setTotalUsage(used);
  }, []);

  const quickActions = tools.filter((t) => MOST_USED.includes(t.id));

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Welcome */}
      <div
        style={{
          padding: "32px 28px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.05))",
          border: "1px solid rgba(124,58,237,0.15)",
          marginBottom: "32px",
        }}
      >
        <h1
          style={{
            margin: "0 0 4px",
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            fontWeight: 700,
            color: "rgba(240,245,255,0.95)",
            letterSpacing: "-0.02em",
          }}
        >
          AI Toolkit
        </h1>
        <p style={{ margin: 0, color: "rgba(200,210,230,0.7)", fontSize: "0.92rem" }}>
          All the AI tools you need, right where you need them.
        </p>
      </div>

      {/* Usage summary */}
      <div
        style={{
          marginBottom: "32px",
          padding: "20px",
          borderRadius: "12px",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(240,245,255,0.9)" }}>
              Today's Usage
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(200,210,230,0.5)" }}>
              Free tier: up to 5 uses per tool
            </div>
          </div>
          <span style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.6)" }}>
            {totalUsage} of {totalLimit} total
          </span>
        </div>
        <UsageLimitBar
          used={totalUsage}
          limit={totalLimit}
          showLabel={false}
        />
      </div>

      {/* All Tools Grid */}
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: "1.05rem",
          fontWeight: 600,
          color: "rgba(240,245,255,0.9)",
        }}
      >
        All Tools
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "14px",
          marginBottom: "40px",
        }}
      >
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {/* Quick Actions */}
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: "1.05rem",
          fontWeight: 600,
          color: "rgba(240,245,255,0.9)",
        }}
      >
        Most Used
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "40px",
        }}
      >
        {quickActions.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {/* Recent Outputs */}
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: "1.05rem",
          fontWeight: 600,
          color: "rgba(240,245,255,0.9)",
        }}
      >
        Recent Outputs
      </h2>
      <div
        style={{
          padding: "32px 24px",
          borderRadius: "12px",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.05)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.8rem", marginBottom: "8px", opacity: 0.5 }}>◈</div>
        <div style={{ fontSize: "0.9rem", color: "rgba(200,210,230,0.5)" }}>
          Your recent outputs will appear here after you generate something.
        </div>
      </div>
    </div>
  );
}
