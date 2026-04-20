"use client";

import { useEffect, useRef, useState } from "react";
import type { Employee } from "@/types/employee";
import { type ActivityType, getRandomActivity } from "@/lib/agentActivity";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { LiveActivityGraph } from "./LiveActivityGraph";

type Line = { text: string; at: number };

const TERMINAL_TICK_MS = 650;
const TERMINAL_MAX_LINES = 9;

const SHELL_BY_ROLE: Record<ActivityType, string> = {
  writer: "gear-pipeline · mdx · node",
  seo: "crawl-engine · python · jq",
  analyst: "duckdb · pandas · gsc-export",
  designer: "sharp · figma-export · cwebp",
};

function formatAgo(at: number) {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m === 1) return "1m";
  if (m < 6) return `${m}m`;
  return "5m+";
}

function seedLines(poolKey: ActivityType): Line[] {
  const out: Line[] = [];
  const n = Math.min(7, TERMINAL_MAX_LINES);
  for (let i = 0; i < n; i++) {
    out.push({
      text: `> ${getRandomActivity(poolKey)}`,
      at: Date.now() - (n - i) * 800,
    });
  }
  return out;
}

export function AgentCard({ employee }: { employee: Employee }) {
  const poolKey = employee.icon_type as ActivityType;
  const [lines, setLines] = useState<Line[]>(() => seedLines(poolKey));
  const [, setTick] = useState(0);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setLines((prev) => {
        const next: Line = {
          text: `> ${getRandomActivity(poolKey)}`,
          at: Date.now(),
        };
        return [...prev, next].slice(-TERMINAL_MAX_LINES);
      });
    }, TERMINAL_TICK_MS);
    return () => clearInterval(id);
  }, [poolKey]);

  useEffect(() => {
    const el = terminalScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="pillar pillar--team">
      <div className="pillar-header-row">
        <EmployeeAvatar
          name={employee.name}
          avatarUrl={employee.avatar_url ?? null}
        />
        <div className="pillar-header-text">
          <div className="pillar-name-row">
            <h3 className="pillar-title" style={{ marginBottom: 0 }}>
              {employee.name}
            </h3>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--blue)",
                background: "rgba(23,64,224,.08)",
                padding: "3px 10px",
                borderRadius: 100,
              }}
            >
              {employee.role_badge}
            </span>
          </div>
        </div>
      </div>
      <p className="pillar-body">{employee.description}</p>
      <div className="employee-live-stack">
        <LiveActivityGraph
          seed={`${employee.id}-${employee.name}`}
          variant={employee.icon_type}
        />
        {employee.stats && employee.stats.length > 0 ? (
          <div className="achievement-stack" aria-label="Career highlights">
            {employee.stats.map((s) => (
              <p key={`${s.value}-${s.label}`} className="achievement-line">
                <span className="achievement-figure">{s.value}</span>
                <span className="achievement-copy">{s.label}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="agent-terminal">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="live-dot text-emerald-500">●</span>
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Live
            </span>
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: "ui-monospace, monospace",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.04em",
            }}
          >
            {SHELL_BY_ROLE[poolKey]}
          </span>
        </div>
        <div ref={terminalScrollRef} className="agent-terminal-body">
          {lines.map((line, i) => (
            <div key={`${line.at}-${i}`} className="agent-terminal-line">
              <span
                className={i === lines.length - 1 ? "cursor-blink" : undefined}
                style={{
                  flex: 1,
                  wordBreak: "break-word",
                  color: "rgba(190, 230, 200, 0.92)",
                }}
              >
                {line.text}
              </span>
              <span style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                {formatAgo(line.at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
