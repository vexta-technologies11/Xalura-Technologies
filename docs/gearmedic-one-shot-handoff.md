# GearMedic ↔ Xalura — one-shot handoff

Send **§2** to GearMedic. Do **§1** yourself first. Use **§3** only if you want an AI to generate client code.

---

## 1) Xalura (you) — do this before GearMedic tests

These are **not** things GearMedic can fix from their side.

1. **Vercel** (project that serves `https://www.xaluratech.com`):
   - **Vercel KV / Redis** (Marketplace): link a store so **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`** are set. Agent ingest **does not use Supabase** — it writes to KV only.
   - **`AGENT_INGEST_SECRET`** = a long random string you invent (e.g. `openssl rand -hex 32`). Same value goes to GearMedic as Bearer.
   - **Supabase** (`NEXT_PUBLIC_*`, anon key, `SUPABASE_SERVICE_ROLE_KEY`): still needed for **human** login and the public **employees** directory — not for `/api/agent-update`.
   - Redeploy after any env change.

2. **Sanity check (browser or curl):**  
   `GET https://www.xaluratech.com/api/ingest-health`  
   - **`kv_configured`** must be **`true`**. If **`false`**, add/link KV and redeploy.

3. **Give GearMedic one shared secret:** the exact **`AGENT_INGEST_SECRET`** string (copy from Vercel; no extra spaces or quotes). Optionally send last 4 characters so they can verify against your Admin → AI Dashboard banner (length + last 4).

4. **Testing-only (optional):** If tokens are still misaligned but you need a green path, set on Vercel `AGENT_UPDATE_ACCEPT_ANY=true`, redeploy — then wrong Bearer still creates a **pending** row (`"mode":"accept_any"`). Turn **`false`** after it works.

5. **First-time “bootstrap”:** Until **some** agent update has been **reviewed** in Admin (AI Dashboard), POSTs may work **without** Bearer. After that, Bearer is required unless you use open/accept-any flags above.

---

## 2) Copy-paste message to GearMedic

You can send this verbatim (fill in the secret when you paste).

---

**Subject: Xalura agent ingest — exact integration spec**

Hi — here is everything needed to POST agent activity to Xalura in one pass.

**Endpoint (production)**  
- URL: `https://www.xaluratech.com/api/agent-update`  
- Method: `POST`  
- Body: JSON object (UTF-8)

**Required JSON fields**  
- `agent_id` — string (e.g. agent name label)  
- `activity_text` — string (what happened)  
- `activity_type` — optional string (e.g. `daily_summary`; defaults if omitted)

**Authentication (shared secret mode — use this unless we give you a per-agent `xal_…` key)**  
- Header: `Authorization: Bearer <AGENT_INGEST_SECRET>`  
- Optional second header (same value, for proxies that strip Authorization): `X-Xalura-Ingest-Token: <AGENT_INGEST_SECRET>`  
- Replace `<AGENT_INGEST_SECRET>` with the **exact** secret we send you separately (must match Xalura’s Vercel env byte-for-byte).

**Example `curl` (replace the secret and run):**

```bash
curl -sS -i -X POST 'https://www.xaluratech.com/api/agent-update' \
  -H 'Authorization: Bearer REPLACE_WITH_SECRET_WE_SEND' \
  -H 'X-Xalura-Ingest-Token: REPLACE_WITH_SECRET_WE_SEND' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data-raw '{"agent_id":"Kimmy","activity_text":"Verification ping from GearMedic","activity_type":"daily_summary"}'
```

**Success**  
- HTTP **200**  
- JSON includes `"ok":true`, an `"id"` (UUID), and `"mode"` (e.g. `"shared_secret"`).

**If JSON POST is blocked by your infra**, use form-encoded (same Bearer):  
- `Content-Type: application/x-www-form-urlencoded; charset=utf-8`  
- Body field **`payload`** = **one** URL-encoded string that is **full JSON**:  
  `payload={"agent_id":"Kimmy","activity_text":"...","activity_type":"daily_summary"}`  
- Do not truncate the JSON inside `payload`.

**Health check (no secret required)**  
- `GET https://www.xaluratech.com/api/ingest-health` — use to confirm the site is configured (we need `supabase_service_role_accepted_by_api: true` on our side).

**Important**  
- The ingest secret is **not** the Supabase anon key and **not** the service_role key — it is **only** the shared string we set as `AGENT_INGEST_SECRET` on Xalura’s Vercel.  
- If you get HTTP **500** with a short `"Invalid API key"` from JSON, that is usually **Xalura’s server Supabase key** on Vercel — tell us; GearMedic cannot fix that by changing headers.

Thanks.

---

## 3) AI / dev prompt (optional — to generate or fix client code)

Paste this to an AI or developer implementing the HTTP client:

> Implement an HTTP **POST** to `https://www.xaluratech.com/api/agent-update` with `Content-Type: application/json; charset=utf-8`, body JSON `{"agent_id": string, "activity_text": string, "activity_type": string optional}`, and header `Authorization: Bearer <token>` where `<token>` is provided by Xalura (shared ingest secret). Optionally duplicate the same token in header `X-Xalura-Ingest-Token`. Read the response JSON; success is HTTP 200 and `ok: true`. If raw JSON POST fails behind a corporate proxy, fall back to `application/x-www-form-urlencoded` with a single field `payload` whose value is the **entire** JSON object as a string. Never send a truncated JSON string. Do not confuse this Bearer token with Supabase keys.

---

## 4) Quick reference

| Who | Responsibility |
|-----|----------------|
| **Xalura / Vercel** | Valid `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` (same project); `AGENT_INGEST_SECRET`; redeploy. |
| **GearMedic** | Store secret securely; send **exact** `Authorization: Bearer <secret>`; valid JSON body with `agent_id` + `activity_text`. |

Full detail: [`agent-update-integration.md`](./agent-update-integration.md).
