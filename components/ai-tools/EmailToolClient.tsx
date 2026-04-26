"use client";

import { useState } from "react";
import { AiToolSubmitBar, AiToolMarkdownResult } from "./AiToolResultPanel";

const initial = {
  purpose: "",
  tone: "Professional, concise",
  length: "Medium (roughly 200–400 words)",
  recipient: "Business decision-maker",
  keyPoints: "",
};

export function EmailToolClient() {
  const [f, setF] = useState(initial);
  const [out, setOut] = useState("");

  return (
    <div className="ai-tools__grid">
      <div className="ai-tools__col">
      <form
        className="ai-tools__form"
        onSubmit={(e) => e.preventDefault()}
        autoComplete="off"
      >
        <label className="ai-tools__field">
          <span className="ai-tools__label">Purpose</span>
          <textarea
            className="ai-tools__input"
            rows={3}
            value={f.purpose}
            onChange={(e) => setF((p) => ({ ...p, purpose: e.target.value }))}
            placeholder="E.g. follow up after a demo, request a decision, or confirm next steps"
            required
          />
        </label>
        <label className="ai-tools__field">
          <span className="ai-tools__label">Tone</span>
          <input
            className="ai-tools__input"
            type="text"
            value={f.tone}
            onChange={(e) => setF((p) => ({ ...p, tone: e.target.value }))}
          />
        </label>
        <div className="ai-tools__field-row">
          <label className="ai-tools__field">
            <span className="ai-tools__label">Length</span>
            <input
              className="ai-tools__input"
              type="text"
              value={f.length}
              onChange={(e) => setF((p) => ({ ...p, length: e.target.value }))}
            />
          </label>
          <label className="ai-tools__field">
            <span className="ai-tools__label">Recipient type</span>
            <input
              className="ai-tools__input"
              type="text"
              value={f.recipient}
              onChange={(e) => setF((p) => ({ ...p, recipient: e.target.value }))}
            />
          </label>
        </div>
        <label className="ai-tools__field">
          <span className="ai-tools__label">Key points (bullets or short list)</span>
          <textarea
            className="ai-tools__input"
            rows={4}
            value={f.keyPoints}
            onChange={(e) => setF((p) => ({ ...p, keyPoints: e.target.value }))}
            placeholder="Callouts, constraints, or facts the email must include"
          />
        </label>
        <AiToolSubmitBar
          apiPath="/api/ai-tools/email"
          body={f}
          onText={setOut}
          onReset={() => setOut("")}
          onSubmitLabel="Generate email"
        />
      </form>
      </div>
      <AiToolMarkdownResult text={out} />
    </div>
  );
}
