"use client";

import { useState } from "react";
import { AiToolSubmitBar, AiToolMarkdownResult } from "./AiToolResultPanel";
import { AiToolSelect, AiToolMainRequest } from "./aiToolFields";
import {
  TONE_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  CONTENT_LENGTH_OPTIONS,
} from "@/lib/aiToolFormConfig";

const toneVals = TONE_OPTIONS.map((t) => ({ value: t, label: t }));
const typeVals = CONTENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }));

export function ContentToolClient() {
  const [request, setRequest] = useState("");
  const [contentType, setContentType] = useState<string>(CONTENT_TYPE_OPTIONS[0]);
  const [tone, setTone] = useState<string>(TONE_OPTIONS[0]);
  const [length, setLength] = useState<string>(CONTENT_LENGTH_OPTIONS[1].value);
  const [out, setOut] = useState("");

  const body = { request, contentType, tone, length };

  return (
    <div className="ai-tools__grid">
      <div className="ai-tools__col">
        <form className="ai-tools__form" onSubmit={(e) => e.preventDefault()} autoComplete="off">
          <AiToolMainRequest
            label="What you need"
            value={request}
            onChange={setRequest}
            placeholder="Topic, audience, keywords, and any must-hits—one place for everything the piece should cover."
            minRows={5}
          />
          <div className="ai-tools__field-row ai-tools__field-row--3">
            <AiToolSelect label="Content type" value={contentType} onChange={setContentType} options={typeVals} />
            <AiToolSelect label="Tone" value={tone} onChange={setTone} options={toneVals} />
            <AiToolSelect label="Length" value={length} onChange={setLength} options={CONTENT_LENGTH_OPTIONS} />
          </div>
          <AiToolSubmitBar
            apiPath="/api/ai-tools/content"
            body={body}
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
