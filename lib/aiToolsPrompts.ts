const MAX_FIELD = 8_000;

function clip(s: string, max: number = MAX_FIELD): string {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

export function buildEmailPrompt(input: {
  purpose: string;
  tone: string;
  length: string;
  recipient: string;
  keyPoints: string;
}): string {
  return `You are a professional business email writer. Generate clear, copy-paste ready email text.

Context:
- Purpose: ${clip(input.purpose)}
- Tone: ${clip(input.tone, 200)}
- Approximate length: ${clip(input.length, 200)}
- Recipient / audience: ${clip(input.recipient, 1_000)}
- Key points to address: ${clip(input.keyPoints)}

Output format (use these exact section headings, no preamble):
**Subject line options (3)**
(Each on its own line with a number or bullet)
**Body**
(The full email, ready to paste)

Do not refer to a product named Mochi or "Mochi" unless the user context explicitly includes it.`;
}

export function buildContentPrompt(input: {
  topic: string;
  contentType: string;
  tone: string;
  length: string;
  keywords: string;
}): string {
  return `You are an SEO-savvy content writer. Produce copy-paste ready, structured content.

Topic: ${clip(input.topic)}
Content type: ${clip(input.contentType, 200)}
Tone: ${clip(input.tone, 200)}
Target length / format: ${clip(input.length, 200)}
Target keywords (use naturally, no stuffing): ${clip(input.keywords, 1_000)}

Use markdown with:
- Suggested H1, then H2 / H3 hierarchy as needed
- Short intro, scannable sections, bullet lists where useful
- A short meta description and suggested slug at the end

Do not name or brand the output as "Mochi" or "Mochi Core". No references to "Mochi" unless the topic explicitly requires it.`;
}

export function buildReportPrompt(input: {
  title: string;
  reportType: string;
  content: string;
}): string {
  return `You are a professional report author. Create a structured, copy-paste ready business report in markdown.

Report title: ${clip(input.title, 500)}
Report type: ${clip(input.reportType, 200)}
Source notes / content to include (synthesize, expand, and structure coherently):
${clip(input.content)}

Include: Executive summary, background / context, analysis or findings, recommendations, optional appendix notes as appropriate. Use clear headings, dates placeholders if unknown, and professional language.

No branding as "Mochi" or similar unless the title or notes demand it.`;
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

