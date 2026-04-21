# GearMedic — `POST /api/agent-update` (canonical)

**URL:** `https://www.xaluratech.com/api/agent-update`  
**Method:** `POST`

### Bootstrap — first request without a token

Until **at least one** `agent_updates` row has been **approved** or **declined** in Admin → AI Dashboard, the route accepts POSTs **without** `Authorization` (JSON or form-encoded). Missing `agent_id` / `activity_text` default to `guest` / `(no activity_text)`. Success responses include `"mode":"bootstrap"`.

After that first review, **Bearer is required** (shared `AGENT_INGEST_SECRET` or per-agent `xal_…`), unless you set `AGENT_UPDATE_OPEN_INGEST=true` on Vercel (keeps unauthenticated POST open — avoid in production).

`GET /api/ingest-health` exposes `unauthenticated_ingest_allowed` and `ingest_credentials_required` (no secrets).

If a valid Bearer is sent during bootstrap, it is honored first (`shared_secret` or `api_key`).

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

## 2) Form-encoded fallback (if JSON POSTs fail behind a proxy)

Use this when a strict intermediary strips or corrupts raw JSON bodies. **Auth is the same** as JSON mode: `Authorization: Bearer …` only (no special form-only header).

The server looks for **one** form field named **`payload`**, **`json`**, or **`data`**. The value must be a **complete JSON object as a single string** — not a prefix, not split across fields. If you truncate after `"agent_id":"Kimmy",` the JSON is invalid and you will get **400**.

```bash
curl -sS -w '\nHTTP:%{http_code}\n' -X POST 'https://www.xaluratech.com/api/agent-update' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' \
  --data-urlencode 'payload={"agent_id":"Kimmy","activity_text":"Saved research packet (5 topics)","activity_type":"daily_summary"}'
```

**Why this looks picky:** URL-encoded mode is a second parser path. Xalura must `JSON.parse` the string inside `payload`. A half-copied example breaks at the comma — that is a client bug, not Xalura “being strict”; invalid JSON is invalid everywhere.

---

## 3) For GearMedic — why Xalura rejects a request (deterministic)

These checks run in order. **Rejections are not arbitrary**; fixing the named condition fixes the response.

| HTTP | Typical response shape | Meaning | What to change on GearMedic / ops |
|------|------------------------|---------|-----------------------------------|
| **401** | `Missing credentials…` | No token in `Authorization: Bearer …` **and** none in `X-Xalura-Ingest-Token` / `X-Ingest-Token` (those headers can replace Bearer if a proxy strips `Authorization`). | Send `Authorization: Bearer <token>`, **or** put the same token in `X-Xalura-Ingest-Token` — **same value** as you would use after `Bearer`, not a second secret. |
| **401** | `Ingest not configured…` | Production has no `AGENT_INGEST_SECRET` (or alias) in Vercel. | Ops: set `AGENT_INGEST_SECRET` on the **same** Vercel project as `www.xaluratech.com`, redeploy. Not fixable from GearMedic config alone. |
| **401** | `Invalid API key…` (no `detail`) | Bearer **does not equal** server `AGENT_INGEST_SECRET`, **and** Bearer is **not** a registered `xal_…` key in our Supabase. | **Shared mode:** paste the exact Vercel secret (compare length + last 4 in Admin → AI Dashboard banner). **Typo, wrong env, or staging vs prod secret** are the usual causes. **Per-agent mode:** use the full `xal_…` from Admin for that employee. |
| **401** | `Unknown xal_ key` + `detail` | Bearer **starts with** `xal_` but that exact string is **not** in `agent_api_keys` for **this** Supabase project (never created, rotated, wrong project, or truncated paste). | Regenerate in Admin → AI Dashboard → Settings, copy the **full** key. If you meant shared ingest, Bearer must be **`AGENT_INGEST_SECRET`** — it does **not** start with `xal_`. |
| **403** | `API key is inactive` | That `xal_` row exists but `is_active` is false. | Re-enable or regenerate in Admin. |
| **403** | `agent_id must be this employee's UUID…` | Per-agent `xal_` key is valid, but `agent_id` is neither that employee’s UUID nor their **display name** (case-insensitive). | Set `agent_id` to the UUID **or** the name shown in Admin (e.g. `Kimmy`). Shared secret mode does **not** run this check — any non-empty `agent_id` is accepted. |
| **400** | `Invalid JSON` / `reason` | Body empty, malformed JSON, or not a JSON object at root. | Fix JSON; for form mode, ensure `payload` contains **full** `{"agent_id":"…","activity_text":"…"}` (see §2). |
| **400** | `agent_id and activity_text are required` | Parsed JSON but missing/blank required fields. | Send both fields non-empty after trim. |
| **500** | `Insert failed` / DB message | Rare DB/constraint issue. | Retry; if persistent, ops checks Supabase logs. |

**Two auth modes — do not mix them up:**

1. **Shared secret** — one `AGENT_INGEST_SECRET` for all agents. Bearer equals that secret. `agent_id` can be any stable label (e.g. `Kimmy`).
2. **Per-agent `xal_…` key** — one key per employee in Admin. Bearer equals that key. `agent_id` must match that employee’s UUID **or** display name.

Using a **shared secret value** in Bearer but expecting **per-agent** behavior (or the reverse) produces **401** until the token matches what the server stores.

---

## 4) Parsing & errors (technical)

The route reads the raw body (BOM-stripped), not only `request.json()`. **400** responses may include:

- `reason`: `empty_body`, `syntax`, `expected_object`, `missing_payload_field`, …  
- `body_bytes`: length received (never echoes your payload)  
- `hint`: optional human hint

---

## 5) Success

**HTTP 200:**

```json
{"ok":true,"id":"<uuid>","mode":"shared_secret"}
```

or `"mode":"api_key"` for per-agent keys.

---

## 6) Diagnostics

`GET https://www.xaluratech.com/api/ingest-health` — includes `shared_ingest_secret_configured`, `supabase_service_role_configured`, and **`supabase_service_role_accepted_by_api`** (a real query; if `false`, fix env before debugging ingest Bearer).

Admin → AI Dashboard **blue banner** — length + last 4 of server-side shared secret for cross-check with Vercel.

### HTTP 500 `{"error":"Invalid API key"}` (short message)

That string is usually **PostgREST / Supabase** rejecting **`SUPABASE_SERVICE_ROLE_KEY`** on the server (wrong project, revoked, or pasted incompletely). It is **not** the GearMedic `Authorization: Bearer` value. Fix **Vercel →** `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` from the **same** Supabase project → API → **service_role**, redeploy, then re-test. Newer API responses may spell this out in `detail` and `supabase_message`.
