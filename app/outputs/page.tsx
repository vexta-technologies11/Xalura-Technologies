"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";

interface SavedOutput {
  id: string;
  toolId: string;
  toolName: string;
  toolIcon: string;
  title: string;
  preview: string;
  date: string;
}

export default function OutputsPage() {
  const [outputs, setOutputs] = useState<SavedOutput[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

  const handleDelete = (id: string) => {
    setOutputs((prev) => prev.filter((o) => o.id !== id));
    setSelected((prev) => prev.filter((s) => s !== id));
  };

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <h1
        className="h1 r"
        style={{
          marginBottom: 4,
          fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)",
        }}
      >
        Saved Outputs
      </h1>
      <p
        className="body-text"
        style={{ marginTop: 0, marginBottom: 24, opacity: 0.9 }}
      >
        All your saved AI-generated outputs in one place.
      </p>

      {outputs.length > 0 ? (
        <>
          {/* Filter and actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { value: "all", label: "All" },
                { value: "letter", label: "Letters" },
                { value: "summarizer", label: "Summaries" },
                { value: "captions", label: "Captions" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className="ai-tools__btn ai-tools__btn--ghost"
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    fontWeight: filter === opt.value ? 600 : 400,
                    background:
                      filter === opt.value ? "rgba(124,58,237,0.2)" : "transparent",
                    borderColor:
                      filter === opt.value
                        ? "rgba(124,58,237,0.4)"
                        : "rgba(255,255,255,0.08)",
                  }}
                  onClick={() => setFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {selected.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  selected.forEach((id) => handleDelete(id));
                }}
              >
                Delete {selected.length} selected
              </Button>
            )}
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            {outputs.map((output) => (
              <div
                key={output.id}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "rgba(0,0,0,0.3)",
                  border: selected.includes(output.id)
                    ? "2px solid #7c3aed"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative",
                }}
                onClick={() => handleSelect(output.id)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{output.toolIcon}</span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "rgba(200,210,230,0.45)",
                    }}
                  >
                    {output.date}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: "rgba(240,245,255,0.9)",
                    marginBottom: "4px",
                  }}
                >
                  {output.title || output.toolName}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "rgba(200,210,230,0.55)",
                    lineHeight: 1.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {output.preview}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon="◈"
          title="No saved outputs yet"
          description="Generate something with any AI tool, then click 'Save' to keep it here."
          action={
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = "/ai-tools";
              }}
            >
              Go to Tools
            </Button>
          }
        />
      )}
    </section>
  );
}
