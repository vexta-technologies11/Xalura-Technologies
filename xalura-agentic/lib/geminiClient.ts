import { resolveWorkerEnv } from "./resolveWorkerEnv";

type GemModel = string;

/**
 * Prefer Google Generative AI SDK when available and a GEMINI_API_KEY is set (this repo
 * uses Google Gemini keys by default). Fall back to the OpenAI Responses endpoint
 * only if Google client is not available or the call fails.
 */
async function callOpenAIResponses(payload: Record<string, unknown>) {
  const key = (await resolveWorkerEnv("GEMINI_API_KEY"))?.trim();
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => "");
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { _raw: text };
  }
  return { ok: res.ok, status: res.status, body: json, raw: text };
}

async function googleGenerateText(prompt: string, model: string, maxOutputTokens?: number) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const key = (await resolveWorkerEnv("GEMINI_API_KEY"))?.trim();
  if (!key) throw new Error("GEMINI_API_KEY not set for Google client");
  const genAI = new GoogleGenerativeAI(key);
  const mdl = genAI.getGenerativeModel({ model, ...(maxOutputTokens ? { generationConfig: { maxOutputTokens } } : {}) });
  const result = await mdl.generateContent(prompt);
  return result.response.text?.() ?? "";
}

export async function geminiComplete(
  prompt: string | string[],
  opts?: { model?: GemModel; temperature?: number; maxOutputTokens?: number },
): Promise<{ text?: string; error?: string }> {
  const envModel = (await resolveWorkerEnv("GEMINI_MODEL"))?.trim();
  const input = Array.isArray(prompt) ? prompt.join("\n") : prompt;
  // Preferred Gemini model candidates when none explicitly requested
  const defaultCandidates = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
  const candidates = opts?.model ? [opts.model] : envModel ? [envModel] : defaultCandidates;

  // Try Google Generative AI first, iterating candidate models until one succeeds
  try {
    for (const mdl of candidates) {
      try {
        const txt = await googleGenerateText(input, mdl, opts?.maxOutputTokens);
        if (txt && txt.trim()) return { text: txt };
      } catch (googleErr) {
        // eslint-disable-next-line no-console
        console.warn(`googleGenerateText failed for model ${mdl}, trying next:`, googleErr instanceof Error ? googleErr.message : String(googleErr));
        // try next model
      }
    }
  } catch (e) {
    // continue to OpenAI fallback
  }

  try {
    const payload: Record<string, unknown> = {
      model: candidates[0],
      input,
    };
    if (opts?.temperature !== undefined) payload["temperature"] = opts.temperature;
    if (opts?.maxOutputTokens !== undefined) payload["max_output_tokens"] = opts.maxOutputTokens;
    const r = await callOpenAIResponses(payload);
    if (!r.ok) return { error: `Gemini(OpenAI) HTTP ${r.status}` };
    const out = r.body?.output;
    if (Array.isArray(out) && out.length > 0) {
      const first = out[0];
      if (typeof first === "string") return { text: first };
      if (typeof first === "object" && first !== null) {
        const txt = (first as any).content?.map?.((c: any) => (c?.text ? c.text : "")).join("") || "";
        if (txt) return { text: txt };
      }
    }
    if (typeof r.raw === "string" && r.raw) return { text: r.raw };
    return { error: "Empty Gemini response" };
  } catch (err: any) {
    return { error: String(err?.message || err) };
  }
}

export async function geminiSuggestUrls(
  query: string,
  max: number = 5,
): Promise<{ items?: { title: string; link: string; snippet?: string }[]; error?: string }> {
  const prompt = [
    `You are a web research assistant. Given the query, return a JSON array of up to ${max} objects with {title, link, snippet}.`,
    `Query: ${query}`,
    `Return only valid JSON.`,
  ];
  const res = await geminiComplete(prompt, { maxOutputTokens: 800, temperature: 0.0 });
  if (res.error) return { error: res.error };
  let txt = (res.text || "").trim();
  // Strip common markdown code fences if present
  const fenceMatch = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    txt = fenceMatch[1].trim();
  }
  // Remove stray backticks and any leading 'json' label
  txt = txt.replace(/`+/g, "");
  txt = txt.replace(/^\s*json\s*/i, "");
  // If still contains leading/trailing markdown, try to extract the first balanced JSON array/object
  if (!txt.startsWith("[") && !txt.startsWith("{")) {
    const maybe = extractBalancedJson(txt);
    if (maybe) txt = maybe;
  }
  // Try parse directly
  try {
    const parsed = JSON.parse(txt) as Array<Record<string, unknown>>;
    const items = parsed
      .filter((r) => r && typeof r === "object")
      .map((r) => ({ title: String(r.title || "").trim(), link: String(r.link || "").trim(), snippet: String(r.snippet || "").trim() }))
      .filter((i) => i.link && /^https?:\/\//i.test(i.link));
    if (items.length) return { items };
  } catch {
    // fall through to stricter second attempt
  }

  // As a fallback, try to extract top-level objects from a messy array string
  try {
    const objs = extractObjectsFromArrayText(txt);
    const items = objs
      .map((r) => ({ title: String(r.title || "").trim(), link: String(r.link || "").trim(), snippet: String(r.snippet || "").trim() }))
      .filter((i) => i.link && /^https?:\/\//i.test(i.link));
    if (items.length) return { items };
  } catch {
    // ignore
  }

  // Second attempt with stricter JSON-only instruction
  const strictPrompt = [
    `Return ONLY a valid JSON array. Do NOT include any explanatory text.`,
    `Each item must be an object with keys: title, link, snippet.`,
    `Query: ${query}`,
    `Max items: ${max}`,
  ];
  const res2 = await geminiComplete(strictPrompt, { maxOutputTokens: 800, temperature: 0.0 });
  if (res2.error) return { error: res2.error };
  const txt2 = (res2.text || "").trim();
  // Strip fences and try to extract balanced JSON then parse
  let cleaned2 = txt2;
  const fenceMatch2 = cleaned2.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch2 && fenceMatch2[1]) cleaned2 = fenceMatch2[1].trim();
  // Remove stray backticks that could still appear around JSON
  cleaned2 = cleaned2.replace(/`+/g, "");
  if (!cleaned2.startsWith("[") && !cleaned2.startsWith("{")) {
    const maybe2 = extractBalancedJson(cleaned2);
    if (maybe2) cleaned2 = maybe2;
  }
  cleaned2 = cleaned2.replace(/^[\s`]*json[\s:`]*/i, "");
  try {
    const parsed2 = JSON.parse(cleaned2) as Array<Record<string, unknown>>;
    const items2 = parsed2
      .filter((r) => r && typeof r === "object")
      .map((r) => ({ title: String(r.title || "").trim(), link: String(r.link || "").trim(), snippet: String(r.snippet || "").trim() }))
      .filter((i) => i.link && /^https?:\/\//i.test(i.link));
    if (items2.length) return { items: items2 };
  } catch (e) {
    // try to salvage objects from messy array text
    try {
      const objs = extractObjectsFromArrayText(cleaned2);
      const items2 = objs
        .map((r) => ({ title: String(r.title || "").trim(), link: String(r.link || "").trim(), snippet: String(r.snippet || "").trim() }))
        .filter((i) => i.link && /^https?:\/\//i.test(i.link));
      if (items2.length) return { items: items2 };
    } catch {
      // ignore
    }
    return { error: `Gemini did not return parseable JSON for suggested URLs (second attempt): ${String(e)}` };
  }
  // If we fell through all attempts, return a generic error
  return { error: "Gemini did not return any usable URL suggestions" };
}

function extractObjectsFromArrayText(s: string): Array<Record<string, unknown>> {
  const start = s.indexOf("[");
  if (start === -1) throw new Error("No array start");
  const objs: Array<Record<string, unknown>> = [];
  let i = start + 1;
  let inString = false;
  let stringChar = "";
  let braceDepth = 0;
  let objStart = -1;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === stringChar && s[i - 1] !== "\\") {
        inString = false;
        stringChar = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{" ) {
      if (braceDepth === 0) objStart = i;
      braceDepth++;
      continue;
    }
    if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && objStart >= 0) {
        const objText = s.slice(objStart, i + 1);
        try {
          const cleaned = objText.replace(/`+/g, "").replace(/^\s*json\s*/i, "");
          const parsed = JSON.parse(cleaned);
          objs.push(parsed as Record<string, unknown>);
        } catch {
          // skip unparsable object
        }
        objStart = -1;
      }
    }
  }
  if (!objs.length) throw new Error("No parsable objects found");
  return objs;
}

function extractBalancedJson(s: string): string | null {
  const startIdx = (() => {
    const a = s.indexOf("[");
    const b = s.indexOf("{");
    if (a === -1 && b === -1) return -1;
    if (a === -1) return b;
    if (b === -1) return a;
    return Math.min(a, b);
  })();
  if (startIdx < 0) return null;
  const startChar = s[startIdx];
  const endChar = startChar === "[" ? "]" : "}";
  let depth = 0;
  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === startChar) depth++;
    else if (ch === endChar) depth--;
    if (depth === 0) {
      return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

export async function geminiExtractFromHtml(
  html: string,
  opts?: { maxChars?: number },
): Promise<{ markdown?: string; error?: string }> {
  const prompt = [
    "You are an extractor. Convert the provided HTML into a concise Markdown summary and include important headings and quoted excerpts. Return only the markdown string.",
    `HTML:\n${html}`,
  ];
  const res = await geminiComplete(prompt, { maxOutputTokens: opts?.maxChars ? Math.min(64_000, Math.ceil(opts.maxChars / 4)) : 2000, temperature: 0.0 });
  if (res.error) return { error: res.error };
  const md = res.text || "";
  return { markdown: md.slice(0, opts?.maxChars || 20_000) };
}

export async function geminiConfigured(): Promise<boolean> {
  const k = (await resolveWorkerEnv("GEMINI_API_KEY"))?.trim();
  return !!k;
}

export default { geminiComplete, geminiSuggestUrls, geminiExtractFromHtml, geminiConfigured };
