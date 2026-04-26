"use client";

import { useState } from "react";
import { AiToolSubmitBar, AiToolMarkdownResult } from "./AiToolResultPanel";
import { AiToolSelect, AiToolMainRequest } from "./aiToolFields";
import {
  TONE_OPTIONS,
  EMAIL_RECIPIENT_OPTIONS,
  EMAIL_LENGTH_OPTIONS,
} from "@/lib/aiToolFormConfig";

const toneVals = TONE_OPTIONS.map((t) => ({ value: t, label: t }));
const recVals = EMAIL_RECIPIENT_OPTIONS.map((t) => ({ value: t, label: t }));

export function EmailToolClient() {
  const [request, setRequest] = useState("");
  const [tone, setTone] = useState<string>(TONE_OPTIONS[0]);
  const [length, setLength] = useState<string>(EMAIL_LENGTH_OPTIONS[1].value);
  const [recipient, setRecipient] = useState<string>(EMAIL_RECIPIENT_OPTIONS[0]);
  const [out, setOut] = useState("");

  const body = { request, tone, length, recipient };

  return (
    <div className="ai-tools__grid">
      <div className="ai-tools__col">
        <form className="ai-tools__form" onSubmit={(e) => e.preventDefault()} autoComplete="off">
          <AiToolMainRequest
            label="What you need"
            value={request}
            onChange={setRequest}
            placeholder="E.g. thank a client after a call, follow up on a contract, or ask for a quick decision with context."
            minRows={5}
          />
          <div className="ai-tools__field-row ai-tools__field-row--3">
            <AiToolSelect label="Tone" value={tone} onChange={setTone} options={toneVals} />
            <AiToolSelect label="Length" value={length} onChange={setLength} options={EMAIL_LENGTH_OPTIONS} />
            <AiToolSelect label="Recipient" value={recipient} onChange={setRecipient} options={recVals} />
          </div>
          <AiToolSubmitBar
            apiPath="/api/ai-tools/email"
            body={body}
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
