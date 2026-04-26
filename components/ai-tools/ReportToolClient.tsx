"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { AiToolSubmitBar, AiToolMarkdownResult } from "./AiToolResultPanel";

const initial = {
  title: "",
  reportType: "Strategic / executive",
  content: "",
};

export function ReportToolClient() {
  const [f, setF] = useState(initial);
  const [out, setOut] = useState("");

  return (
    <div className="ai-tools__grid">
      <div className="ai-tools__col">
      <form
        className="ai-tools__form ai-tools__no-print"
        onSubmit={(e) => e.preventDefault()}
        autoComplete="off"
      >
        <label className="ai-tools__field">
          <span className="ai-tools__label">Report title</span>
          <input
            className="ai-tools__input"
            type="text"
            value={f.title}
            onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
            placeholder="Appears in the printout header"
            required
          />
        </label>
        <label className="ai-tools__field">
          <span className="ai-tools__label">Report type / audience</span>
          <input
            className="ai-tools__input"
            type="text"
            value={f.reportType}
            onChange={(e) => setF((p) => ({ ...p, reportType: e.target.value }))}
          />
        </label>
        <label className="ai-tools__field">
          <span className="ai-tools__label">Content / source notes</span>
          <textarea
            className="ai-tools__input"
            rows={8}
            value={f.content}
            onChange={(e) => setF((p) => ({ ...p, content: e.target.value }))}
            placeholder="Paste bullets, rough data, or outline — the model will structure and expand"
            required
          />
        </label>
        <AiToolSubmitBar
          apiPath="/api/ai-tools/report"
          body={f}
          onText={setOut}
          onReset={() => setOut("")}
          onSubmitLabel="Generate report"
        />
      </form>
      {out ? (
        <div className="ai-tools__report-extras ai-tools__no-print">
          <button
            type="button"
            className="ai-tools__btn ai-tools__btn--ghost"
            onClick={() => {
              if (f.title) document.title = f.title;
              window.print();
            }}
          >
            <Printer size={16} />
            Print / save as PDF
          </button>
        </div>
      ) : null}
      </div>
      <AiToolMarkdownResult text={out} printId="ai-tools-print-root" />
    </div>
  );
}
