# Cloudflare Workers — API Architecture Spec
**Platform:** AI Toolkit | **Runtime:** Cloudflare Workers (ES Modules) | **Phase:** 4 (API Integration — Build Last)

---

## ⚠️ IMPORTANT: Build This Last
This file documents the API layer. All tool UIs should be built first with stubbed service functions. Wire this in during Phase 4 only.

---

## 📁 Workers Project Structure

```
workers/
├── wrangler.toml
├── src/
│   ├── index.ts                     # Main router
│   ├── middleware/
│   │   ├── auth.ts                  # JWT session validation
│   │   ├── rateLimit.ts             # KV-based rate limiting
│   │   ├── usageCheck.ts            # Tier usage limit enforcement
│   │   └── cors.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── billing.ts
│   │   ├── files.ts
│   │   └── tools/
│   │       ├── resumeBuilder.ts
│   │       ├── summarizer.ts
│   │       ├── translator.ts
│   │       ├── letterWriter.ts
│   │       ├── presentationBuilder.ts
│   │       ├── captionGenerator.ts
│   │       ├── invoiceGenerator.ts
│   │       └── studyGenerator.ts
│   ├── services/
│   │   ├── claude.ts                # Claude API client
│   │   ├── translator.ts            # Microsoft Translator client
│   │   ├── r2.ts
│   │   ├── d1.ts
│   │   └── stripe.ts
│   └── types/
└── package.json
```

---

## 🤖 Claude API Service

```typescript
const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function callClaude(request: ClaudeRequest, env: Env): Promise<ClaudeResponse> {
  // POST to Claude API with system prompt + user message
  // Returns text or parsed JSON depending on jsonMode flag
}
```

---

## 🌐 Microsoft Translator Service

```typescript
export async function translateText(text: string, from: string | null, to: string, env: Env) {
  // POST to Microsoft Translator Cognitive Services endpoint
  // Returns { translated, detectedLanguage? }
}
```

---

## 🔒 Auth Middleware
- Validates Bearer token from Clerk JWT
- Checks KV cache first for session
- Falls back to Clerk verification
- Returns userId + tier

## 📊 Rate Limiting
- KV key: `usage:${userId}:${toolId}:daily`
- TTL set to midnight
- D1 logging for monthly aggregation
- Hard block at limit with 429 response

---

## ✅ Phase 4 Integration Checklist
- [ ] wrangler.toml configured with all bindings
- [ ] D1 database schema migrated
- [ ] KV namespace created
- [ ] R2 bucket created with lifecycle rules
- [ ] Claude API integrated in all text tools
- [ ] Microsoft Translator integrated in Tool 06
- [ ] Auth middleware validates Clerk JWT
- [ ] Rate limiting works per user per tool
- [ ] Usage increments correctly on success
- [ ] Stripe webhooks handle all events
- [ ] Resend email triggers on all events
- [ ] All Workers deployed to production
- [ ] All frontend stubs replaced with real API calls
