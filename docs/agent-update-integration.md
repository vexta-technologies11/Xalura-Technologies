# GearMedic / server-to-server — `POST /api/agent-update`

Use this if you get **400 Invalid JSON** or need a **reliable** integration path.

## What changed (why JSON failed before)

Some clients and proxies interact badly with the default `request.json()` path. The route now:

1. Reads the body with **`request.text()`**, strips **UTF-8 BOM**, trims whitespace, then **`JSON.parse`**.
2. Returns **400** with a small **`reason`** field: `empty_body`, `syntax`, `expected_object`, etc., plus **`body_bytes`** when useful (never echoes your payload).
3. Supports an alternate encoding if raw JSON POSTs keep failing (see **Form fallback**).

## Auth (unchanged)

- **`Authorization: Bearer <AGENT_INGEST_SECRET>`** (case-insensitive `Bearer`), or  
- **`X-Xalura-Ingest-Token: <same secret>`** or **`X-Ingest-Token`**

Secret must match **Xalura Vercel** `AGENT_INGEST_SECRET` (compare **length + last 4** in Admin → AI Dashboard blue banner).

## JSON body (required fields)

Root must be a **JSON object** `{}`, not an array.

```json
{
  "agent_id": "Kimmy",
  "activity_text": "Plain text update.",
  "activity_type": "daily_summary"
}
```

- **Required:** `agent_id`, `activity_text`  
- **Optional:** `activity_type` (defaults to `"status"`)

## Recommended curl (copy as one line)

Replace `SECRET` with your ingest secret (no angle brackets in the real command):

```bash
curl -sS -w '\nHTTP:%{http_code}\n' -X POST 'https://www.xaluratech.com/api/agent-update' -H 'Authorization: Bearer SECRET' -H 'Content-Type: application/json; charset=utf-8' --data-raw '{"agent_id":"Kimmy","activity_text":"test ingest","activity_type":"daily_summary"}'
```

**Use `--data-raw`** (not `-d` with fragile quoting) to avoid shell eating characters.

### Body from file (avoids shell escaping)

```bash
printf '%s' '{"agent_id":"Kimmy","activity_text":"test ingest","activity_type":"daily_summary"}' > /tmp/xalura.json
curl -sS -w '\nHTTP:%{http_code}\n' -X POST 'https://www.xaluratech.com/api/agent-update' -H 'Authorization: Bearer SECRET' -H 'Content-Type: application/json' --data-binary @/tmp/xalura.json
```

## Form fallback (if JSON POST body is still empty upstream)

`Content-Type: application/x-www-form-urlencoded`  
Form field **`payload`** (or **`json`** / **`data`**) = **URL-encoded JSON string**.

Example:

```bash
curl -sS -X POST 'https://www.xaluratech.com/api/agent-update' \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'payload={"agent_id":"Kimmy","activity_text":"test ingest","activity_type":"daily_summary"}'
```

## Success

**HTTP 200** — `{"ok":true,"id":"<uuid>","mode":"shared_secret"}` (or `"api_key"` for per-agent keys).

## Diagnostics

- **`GET /api/ingest-health`** — confirms shared secret + service role are configured (no secrets returned).
- **400 responses** now include **`reason`** to distinguish empty body vs bad syntax vs wrong root type.

## Per-agent `xal_` keys (different mode)

Bearer = `xal_…` from Admin → AI Dashboard → Settings, and **`agent_id` must be that employee’s UUID** — not the display name. This is **separate** from the shared ingest secret.
