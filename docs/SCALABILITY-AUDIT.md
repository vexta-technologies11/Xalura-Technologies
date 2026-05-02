# Production Scalability Audit — 10k–20k Users

## Current Architecture Summary

| Component | Tech | User Data Persistence |
|-----------|------|----------------------|
| AI Tools (23 tools) | Gemini API via Next.js routes | **None** — ephemeral, no DB writes |
| Usage limits | `localStorage` (client-side) | **None** — trivially bypassable |
| File uploads | Browser `File.text()` | **None** — read client-side only |
| Auth | Supabase Auth (cookies) | Session only — no user profile table |
| Database | Supabase (free tier) | Used for CMS content, not user data |
| Cron jobs | Cloudflare Workers | Service role access — not user-facing |
| Hosting | Cloudflare Workers via OpenNext | Edge runtime |

---

## ✅ PASS — No Database Overload Risk

### 1. User AI Tool Usage
- **No user data written to Supabase** from any of the 23 AI tools.
- Usage tracking (`lib/usageStore.ts`) uses `localStorage` exclusively.
- No `user_generations`, `usage_log`, or `ai_output` table exists.
- **Safe at 20k users** — zero database writes per generation.

### 2. File Uploads
- Files are read in the browser via `File.text()` and sent as text to Gemini API.
- No file is stored in Supabase Storage from user uploads.
- **Safe** — no database impact.

### 3. Public pages
- `getEmployees()`, `getPartners()`, `getPageContent()` all have graceful fallback defaults when Supabase is unavailable.
- Pages remain functional even with DB failure.

### 4. Anti-bot mechanism
- `lib/antiBot.ts` is client-side only (emoji puzzles, math problems).
- **Ineffective against bots** — no server-side validation.
- No database impact.

---

## ⚠️ MODERATE RISK — Monitor These

### 5. Gemini API Cost at Scale
- `FREE_DAILY_LIMIT = 15` generations/user in localStorage.
- 15 × 20,000 = **300,000 API calls/day**.
- `gemini-2.5-flash-lite` at ~$0.075/1K input tokens:
  - ~1,000 tokens average → $0.000075/call
  - **~$22.50/day → ~$675/month**

**Recommendation**: Implement server-side rate limiting (see below) to prevent abuse, since localStorage limits are easily bypassed.

### 6. Supabase Auth — Middleware Overhead
- Middleware fires `supabase.auth.getUser()` on every `/admin/:path*` and `/login` request.
- At 20k users, each visiting admin 5×/day = 100k auth token verifications.
- Supabase free tier: 50k requests/hour limit → fine for auth alone.
- **Risk**: If Supabase has an outage, admin pages become inaccessible.

---

## 🔴 FIX — Issues to Address Now

### 7. Middleware — Skip Auth Check for Static Assets / API

The middleware runs on EVERY admin request including images, fonts, and JS bundles. Optimize by only checking auth on page routes.

### 8. Client-Side Rate Limiting is Insecure
- Any user can clear `localStorage` to reset their 15 daily generations.
- This means the Gemini API budget is essentially unlimited per user.

**Fix**: Add server-side rate limiting via KV storage.

### 9. No Database Connection Pooling at Scale
- Each Next.js SSR request creates a new Supabase client.
- Free Supabase tier limits concurrent connections (~2–10).
- Normal user traffic is fine, but a traffic spike could exhaust connections.

---

## 🛠️ Recommended Production Optimizations

### Immediate (implement now):

1. **Add server-side rate limiting** using Cloudflare KV to enforce 15 generations/day per IP.
2. **Cache tool categories** — avoid N+1 query on admin pages with static cache.
3. **Skip middleware auth for static assets** to reduce Supabase Auth load.

### Short-term (before 10k users):

4. **Set up Gemini API budget alerts** in GCP console.
5. **Add monitoring** — track API call counts and error rates.
6. **Upgrade from free Supabase** to Pro tier ($25/mo) for connection pooling.

### Long-term (10k–20k users):

7. **Move to server-side usage tracking** using Cloudflare Workers KV.
8. **Implement user authentication** for proper rate limiting per account.
9. **Add query caching** via ISR (Incremental Static Regeneration) for CMS pages.
