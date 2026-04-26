"use client";

import { useState } from "react";
import { AiToolSubmitBar, AiToolMarkdownResult } from "./AiToolResultPanel";

const initial = {
  topic: "",
  contentType: "Blog / article",
  tone: "Authoritative, helpful, SEO-friendly",
  length: "1,200–1,800 words, scannable with H2s",
  keywords: "",
};

export function ContentToolClient() {
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
          <span className="ai-tools__label">Topic</span>
          <input
            className="ai-tools__input"
            type="text"
            value={f.topic}
            onChange={(e) => setF((p) => ({ ...p, topic: e.target.value }))}
            placeholder="The main subject or working title"
            required
          />
        </label>
        <div className="ai-tools__field-row">
          <label className="ai-tools__field">
            <span className="ai-tools__label">Content type</span>
            <input
              className="ai-tools__input"
              type="text"
              value={f.contentType}
              onChange={(e) => setF((p) => ({ ...p, contentType: e.target.value }))}
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
        </div>
        <label className="ai-tools__field">
          <span className="ai-tools__label">Target length / format</span>
          <input
            className="ai-tools__input"
            type="text"
            value={f.length}
            onChange={(e) => setF((p) => ({ ...p, length: e.target.value }))}
          />
        </label>
        <label className="ai-tools__field">
          <span className="ai-tools__label">Target keywords (comma or line-separated)</span>
          <textarea
            className="ai-tools__input"
            rows={3}
            value={f.keywords}
            onChange={(e) => setF((p) => ({ ...p, keywords: e.target.value }))}
            placeholder="Primary and secondary terms to work in naturally"
          />
        </label>
        <AiToolSubmitBar
          apiPath="/api/ai-tools/content"
          body={f}
          onText={setOut}
          onReset={() => setOut("")}
          onSubmitLabel="Generate content"
        />
      </form>
      </div>
      <AiToolMarkdownResult text={out} />
    </div>
  );
}
