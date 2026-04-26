const MAX_FIELD = 8_000;

function clip(s: string, max: number = MAX_FIELD): string {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

export function buildEmailPrompt(input: {
  request: string;
  tone: string;
  lengthInstruction: string;
  recipient: string;
}): string {
  return `You are a professional business email writer. Generate clear, copy-paste ready email text.

What the user needs:
${clip(input.request)}

Settings:
- Tone: ${clip(input.tone, 200)}
- Length: ${clip(input.lengthInstruction, 500)}
- Recipient / audience: ${clip(input.recipient, 1_000)}

Output format (use these exact section headings, no preamble):
**Subject line options (3)**
(Each on its own line with a number or bullet)
**Body**
(The full email, ready to paste)

Do not refer to a product named Mochi or "Mochi" unless the user context explicitly includes it.`;
}

export function buildContentPrompt(input: {
  request: string;
  contentType: string;
  tone: string;
  lengthInstruction: string;
}): string {
  return `You are an SEO-savvy content writer. Produce copy-paste ready, structured content.

What the user needs (topic, angle, audience, keywords—use as given):
${clip(input.request)}

Settings:
- Content type: ${clip(input.contentType, 200)}
- Tone: ${clip(input.tone, 200)}
- Length: ${clip(input.lengthInstruction, 500)}

Use markdown with:
- Suggested H1, then H2 / H3 hierarchy as needed
- Short intro, scannable sections, bullet lists where useful
- A short meta description and suggested slug at the end

Do not name or brand the output as "Mochi" or "Mochi Core". No references to "Mochi" unless the topic explicitly requires it.`;
}

export function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonOk(text: string) {
  return new Response(JSON.stringify({ ok: true, text }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonOkReport(payload: {
  document: object;
  templateId: string;
  templateLabel: string;
  documentTitle: string;
}) {
  return new Response(JSON.stringify({ ok: true, ...payload }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

