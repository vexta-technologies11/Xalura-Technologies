# GearMedic — `POST /api/agent-update` (canonical)

**URL:** `https://www.xaluratech.com/api/agent-update`  
**Method:** `POST`

---

## 1) JSON request (preferred)

Headers:

- `Authorization: Bearer <token>` — either **`AGENT_INGEST_SECRET`** (shared) **or** per-agent **`xal_…`** key from Admin → AI Dashboard → Settings  
- `Accept: application/json` (optional; ignored by server)  
- `Content-Type: application/json; charset=utf-8`

Body (object):

```json
{
  "agent_id": "Kimmy",
  "activity_text": "Saved research packet (5 topics) and emailed you@example.com",
  "activity_type": "daily_summary"
}
```

- **Required:** `agent_id`, `activity_text`  
- **Optional:** `activity_type` (defaults to `"status"` if omitted)

### `agent_id` rules

| Auth token | `agent_id` value |
|------------|------------------|
| **Shared** `AGENT_INGEST_SECRET` | Any stable string (e.g. `Kimmy`, `Mochi`) — pending until you approve in Admin. |
| **Per-agent** `xal_…` key | **Employee UUID** *or* **that employee’s display name** in Supabase (case-insensitive, trimmed). Example: `"Kimmy"` works for Kimmy’s key if `employees.name` is `Kimmy`. |

### Example curl (shared secret)

```bash
curl -sS -w '\nHTTP:%{http_code}\n' -X POST 'https://www.xaluratech.com/api/agent-update' \
  -H 'Authorization: Bearer YOUR_AGENT_INGEST_SECRET' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data-raw '{"agent_id":"Kimmy","activity_text":"Codex verification test","activity_type":"daily_summary"}'
```

Optional duplicate header (same value as Bearer, for picky clients):

`X-Xalura-Ingest-Token: YOUR_AGENT_INGEST_SECRET`

### Example curl (per-agent `xal_` key + display name)

```bash
curl -sS -w '\nHTTP:%{http_code}\n' -X POST 'https://www.xaluratech.com/api/agent-update' \
  -H 'Authorization: Bearer YOUR_xal_KEY' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data-raw '{"agent_id":"Kimmy","activity_text":"Draft created and emailed: Title (slug: my-slug)","activity_type":"daily_summary"}'
```

Use **`--data-raw`** or **`--data-binary @file`** to avoid shell mangling JSON.

---

## 2) Form-encoded fallback (if JSON returns 4xx from proxies)

Same Bearer; body in form field **`payload`** (or **`json`** / **`data`**):

```bash
curl -sS -w '\nHTTP:%{http_code}\n' -X POST 'https://www.xaluratech.com/api/agent-update' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' \
  --data-urlencode 'payload={"agent_id":"Kimmy","activity_text":"Saved research packet (5 topics)","activity_type":"daily_summary"}'
```

---

## 3) Parsing & errors

The route reads the raw body (BOM-stripped), not only `request.json()`. **400** responses may include:

- `reason`: `empty_body`, `syntax`, `expected_object`, …  
- `body_bytes`: length received (never echoes your payload)

**401** — bad/missing token, or ingest secret not set on Vercel.  
**403** — inactive `xal_` key, or `agent_id` doesn’t match UUID/name for that key.

---

## 4) Success

**HTTP 200:**

```json
{"ok":true,"id":"<uuid>","mode":"shared_secret"}
```

or `"mode":"api_key"` for per-agent keys.

---

## 5) Diagnostics

`GET https://www.xaluratech.com/api/ingest-health` — `shared_ingest_secret_configured` + `supabase_service_role_configured` (no secrets).

Admin → AI Dashboard **blue banner** — length + last 4 of server-side shared secret for cross-check with Vercel.
