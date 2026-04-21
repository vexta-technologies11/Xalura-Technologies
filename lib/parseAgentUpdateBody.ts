/**
 * Robust parsing for /api/agent-update — avoids request.json() edge cases (BOM, empty body,
 * some proxies). Optional form fallback for clients that struggle with raw JSON POSTs.
 */

export type ParsedAgentBody = {
  agent_id?: string;
  activity_text?: string;
  activity_type?: string;
};

export type ParseFailure = {
  error: string;
  reason?: string;
  body_bytes?: number;
  hint?: string;
};

export async function parseAgentUpdateBody(
  request: Request,
): Promise<{ ok: true; body: ParsedAgentBody } | { ok: false; payload: ParseFailure }> {
  const ct = request.headers.get("content-type") ?? "";

  if (ct.toLowerCase().includes("application/x-www-form-urlencoded")) {
    try {
      const form = await request.formData();
      const raw =
        form.get("payload") ?? form.get("json") ?? form.get("data");
      if (typeof raw !== "string" || !raw.trim()) {
        return {
          ok: false,
          payload: {
            error: "Invalid form body",
            reason: "missing_payload_field",
            hint: "Use field name payload, json, or data with a JSON string value.",
          },
        };
      }
      const trimmed = stripBom(raw).trim();
      const parsed = JSON.parse(trimmed) as unknown;
      const obj = asObject(parsed);
      if (!obj) {
        return {
          ok: false,
          payload: {
            error: "Invalid JSON in form field",
            reason: "expected_json_object",
          },
        };
      }
      return { ok: true, body: obj };
    } catch {
      return {
        ok: false,
        payload: {
          error: "Invalid JSON in form field",
          reason: "form_json_syntax",
        },
      };
    }
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      payload: {
        error: "Could not read request body",
        reason: "read_failed",
      },
    };
  }

  const trimmed = stripBom(raw).trim();
  if (!trimmed) {
    return {
      ok: false,
      payload: {
        error: "Invalid JSON",
        reason: "empty_body",
        body_bytes: raw.length,
        hint: "Request body was empty after trim. Ensure POST includes a body and Content-Length.",
      },
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const obj = asObject(parsed);
    if (!obj) {
      return {
        ok: false,
        payload: {
          error: "Invalid JSON",
          reason: "expected_object",
          body_bytes: raw.length,
          hint: "Root JSON value must be an object {}, not an array or string.",
        },
      };
    }
    return { ok: true, body: obj };
  } catch {
    return {
      ok: false,
      payload: {
        error: "Invalid JSON",
        reason: "syntax",
        body_bytes: raw.length,
        hint: "JSON.parse failed. Check quotes, trailing commas, and UTF-8 encoding.",
      },
    };
  }
}

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

function asObject(v: unknown): ParsedAgentBody | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as ParsedAgentBody;
}
