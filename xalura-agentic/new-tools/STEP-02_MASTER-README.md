# AI Toolkit Platform — Master Build Specification
**Version:** 1.0 | **Stack:** Cloudflare Workers + Pages + D1 + R2 + KV | **Framework:** React + TypeScript

---

## 🗺️ Platform Overview

A multi-tool AI SaaS platform offering 11 productivity tools powered by the Claude API and Microsoft Translator API. Built entirely on Cloudflare infrastructure for maximum margin and minimum cost.

---

## 📦 Tool Inventory

| # | Tool | Spec File | Primary API | Revenue Tier | Upload [PRO] |
|---|---|---|---|---|---|
| 04 | Resume + Cover Letter | `04-resume-builder.md` | Claude | Starter+ | ✅ FLAGSHIP |
| 05 | Document Summarizer | `05-document-summarizer.md` | Claude | Free + Starter+ | ✅ |
| 06 | AI Translator | `06-ai-translator.md` | Microsoft Translator | Free + Starter+ | — |
| 07 | Letter Writer | `07-letter-writer.md` | Claude | Free + Starter+ | ✅ |
| 08 | Presentation Builder | `08-presentation-builder.md` | Claude | Starter+ | ✅ |
| 09 | Caption Generator | `09-caption-generator.md` | Claude | Free + Starter+ | ✅ |
| 11 | Study Guide + Quiz Maker | `11-study-guide-quiz.md` | Claude | Free + Starter+ | ✅ |
| —  | **PRO File Upload & Rewrite** | `13-pro-file-upload-rewrite.md` | Claude | Starter+ | FEATURE SPEC |

> **[PRO] Upload Feature:** Users upload existing documents (resume, article, email, invoice, etc.) and AI rewrites/optimizes them based on selected parameters. All AI-rewritten outputs are stamped **"REVISED BY AI"** with a diff viewer showing original vs. revised. This is the primary free → paid conversion driver. See `13-pro-file-upload-rewrite.md` for full spec.

---

## 🏗️ Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                          │
│                  React + TypeScript SPA                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Tool Pages│  │Auth Pages│  │Settings  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                  CLOUDFLARE WORKERS                          │
│                   API Route Layer                            │
│                                                              │
│  /api/auth/*          /api/tools/*        /api/user/*       │
│  /api/billing/*       /api/files/*        /api/admin/*      │
└──────────┬────────────────┬───────────────────┬─────────────┘
           │                │                   │
    ┌──────▼──────┐  ┌──────▼──────┐   ┌────────▼────────┐
    │ Cloudflare  │  │  External   │   │   Cloudflare    │
    │  D1 + KV   │  │    APIs     │   │      R2         │
    │  + R2       │  │             │   │   PDF Storage   │
    └─────────────┘  │ Claude API  │   └─────────────────┘
                     │ MS Translator│
                     │ Stripe       │
                     │ Resend       │
                     └─────────────┘
```

---

## 🔐 Authentication & User System

### Auth Stack
- **Provider:** Clerk.dev (10,000 MAU free)
- **Methods:** Email/password, Google OAuth, Apple OAuth
- **Session:** JWT stored in Cloudflare KV

### User Tiers
```typescript
type UserTier = 'free' | 'starter' | 'pro' | 'agency';

interface UserProfile {
  id: string;
  email: string;
  tier: UserTier;
  createdAt: Date;
  usageToday: Record<ToolId, number>;   // stored in KV
  usageMonth: Record<ToolId, number>;   // stored in D1
  savedOutputs: number;
  stripeCustomerId: string | null;
}
```

### Usage Limits per Tier
```typescript
const LIMITS: Record<UserTier, Record<string, number>> = {
  free: {
    dailyGenerations: 5,        // per tool
    inputWordLimit: 500,
    savedOutputs: 10,
    pdfExports: 3,
  },
  starter: {
    dailyGenerations: 30,
    inputWordLimit: 5000,
    savedOutputs: 100,
    pdfExports: 50,
  },
  pro: {
    dailyGenerations: 200,
    inputWordLimit: 50000,
    savedOutputs: 1000,
    pdfExports: 500,
  },
  agency: {
    dailyGenerations: -1,       // unlimited
    inputWordLimit: -1,
    savedOutputs: -1,
    pdfExports: -1,
  }
}
```

---

## 💳 Billing System

### Stripe Integration
```typescript
// Subscription products (configure in Stripe Dashboard)
const PRODUCTS = {
  starter_monthly: 'price_starter_monthly',    // $12/mo
  starter_annual:  'price_starter_annual',     // $8.40/mo × 12
  pro_monthly:     'price_pro_monthly',        // $29/mo
  pro_annual:      'price_pro_annual',         // $20.30/mo × 12
  agency_monthly:  'price_agency_monthly',     // $79/mo
  agency_annual:   'price_agency_annual',      // $55.30/mo × 12
}

// Credit packs (one-time)
const CREDIT_PACKS = {
  small:  { price: '$5',  credits: 50  },
  medium: { price: '$12', credits: 150 },
  large:  { price: '$25', credits: 400 },
}
```

### Webhook Events to Handle
- `customer.subscription.created` → upgrade user tier in D1
- `customer.subscription.deleted` → downgrade to free tier
- `invoice.payment_failed` → send warning email via Resend
- `checkout.session.completed` → credit pack purchase → add credits to KV

---

## 🗄️ Database Schema (Cloudflare D1)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking
CREATE TABLE usage_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  input_words INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Saved outputs
CREATE TABLE saved_outputs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,          -- JSON: settings used, word count, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Business profiles (Invoice tool)
CREATE TABLE business_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL,     -- JSON: full profile data
  is_default BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- PDF storage metadata
CREATE TABLE pdf_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT,
  expires_at DATETIME,
  share_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## ⚡ Cloudflare KV Keys

```typescript
// Usage counters (TTL: end of day)
`usage:${userId}:${toolId}:daily`     → number
`usage:${userId}:credits`             → number

// Session data
`session:${sessionToken}`             → UserProfile JSON

// Rate limiting
`ratelimit:${userId}:${toolId}`       → number (requests per minute)

// PDF share links
`share:${shareToken}`                 → { r2Key, expiresAt, userId }

// Reverse trial tracking
`trial:${userId}`                     → { startDate, daysUsed, converted }
```

---

## 📁 Cloudflare R2 Bucket Structure

```
toolkit-pdfs/
├── {userId}/
│   ├── invoices/
│   │   └── {fileId}.pdf
│   ├── resumes/
│   │   └── {fileId}.pdf
│   ├── documents/
│   │   └── {fileId}.pdf
│   └── presentations/
│       └── {fileId}.pdf
└── shared/
    └── {shareToken}.pdf    # Public share links
```

**Lifecycle rules:**
- Regular files: auto-delete after 30 days
- Shared files: auto-delete after share link expiry

---

## 🌐 Cloudflare Worker Routes

```typescript
// Auth
POST   /api/auth/session           // Create session from Clerk JWT
DELETE /api/auth/session           // Logout + clear KV session

// User
GET    /api/user/profile           // Get user profile + usage stats
GET    /api/user/outputs           // List saved outputs
DELETE /api/user/outputs/:id       // Delete saved output

// Tools (all tools follow this pattern)
POST   /api/tools/resume-builder
POST   /api/tools/resume-builder/enhance      // Bullet enhancer
POST   /api/tools/resume-builder/cover-letter
POST   /api/tools/summarizer
POST   /api/tools/translator
POST   /api/tools/translator/detect
POST   /api/tools/letter-writer
POST   /api/tools/presentation-builder
POST   /api/tools/caption-generator
POST   /api/tools/invoice-generator/pdf
POST   /api/tools/invoice-generator/letter
POST   /api/tools/study-generator

// Files
GET    /api/files/:fileId          // Get file metadata
GET    /api/files/:fileId/download // Signed R2 download URL
POST   /api/files/share/:fileId    // Generate share link

// Billing
POST   /api/billing/checkout       // Create Stripe checkout session
POST   /api/billing/portal         // Customer portal link
POST   /api/billing/webhook        // Stripe webhook handler

// Admin
GET    /api/admin/stats            // Platform usage stats
```

---

## 🎨 Design System

### Global CSS Variables
```css
:root {
  /* Core palette */
  --color-bg:        #0a0a0f;
  --color-surface:   #13131a;
  --color-border:    #1f1f2e;
  --color-text:      #f0f0f5;
  --color-muted:     #6b6b80;
  --color-accent:    #7c3aed;     /* violet — platform brand */
  --color-success:   #10b981;
  --color-warning:   #f59e0b;
  --color-error:     #ef4444;

  /* Typography */
  --font-display:    'Clash Display', sans-serif;
  --font-body:       'DM Sans', sans-serif;
  --font-mono:       'JetBrains Mono', monospace;

  /* Spacing scale */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   40px;
  --space-2xl:  64px;

  /* Border radius */
  --radius-sm:  6px;
  --radius-md:  12px;
  --radius-lg:  20px;
  --radius-xl:  32px;

  /* Shadows */
  --shadow-sm:  0 2px 8px rgba(0,0,0,0.3);
  --shadow-md:  0 8px 24px rgba(0,0,0,0.4);
  --shadow-lg:  0 24px 64px rgba(0,0,0,0.5);
}
```

### Shared Components (Used Across All Tools)
```
/components/shared/
├── Button/
│   ├── Button.tsx           # Primary, Secondary, Ghost, Danger variants
│   └── LoadingButton.tsx    # With spinner state
├── Input/
│   ├── TextInput.tsx        # Standard text input
│   ├── TextArea.tsx         # Multi-line input
│   └── SelectInput.tsx      # Dropdown select
├── Feedback/
│   ├── Toast.tsx            # Toast notifications
│   ├── LoadingSkeleton.tsx  # Shimmer loading state
│   ├── ErrorBoundary.tsx    # Error catch wrapper
│   └── EmptyState.tsx       # Empty state illustration
├── Layout/
│   ├── SplitPanel.tsx       # Left/Right split layout
│   ├── PageHeader.tsx       # Tool header with title + description
│   ├── Sidebar.tsx          # App-wide navigation sidebar
│   └── UsageBar.tsx         # Daily usage limit indicator
├── Cards/
│   ├── OutputCard.tsx       # Saved output card
│   └── ToolCard.tsx         # Tool selection card on dashboard
└── Modals/
    ├── Modal.tsx             # Base modal component
    ├── ConfirmModal.tsx      # Confirm action dialog
    └── UpgradeModal.tsx      # Upgrade tier prompt
```

---

## 🏠 Dashboard Page

**Route:** `/dashboard`

### Layout
```
┌────────────────────────────────────────────────────────┐
│  SIDEBAR          │  MAIN CONTENT                      │
│                   │                                    │
│  Logo             │  Welcome back, [Name]              │
│  ─────────        │  ──────────────────────────────   │
│  Dashboard        │  Usage This Month                  │
│  ─────────        │  [Usage bars per tool]             │
│  Tools            │                                    │
│  • Email          │  Your Tools                        │
│  • Article        │  [11 tool cards in 3-col grid]     │
│  • PDF            │                                    │
│  • Resume         │  Recent Outputs                    │
│  • Summarizer     │  [Last 5 saved outputs]            │
│  • Translator     │                                    │
│  • Letter         │  Quick Actions                     │
│  • Presentation   │  [Most used tools shortcuts]       │
│  • Captions       │                                    │
│  • Invoice        │                                    │
│  • Study Guide    │                                    │
│  ─────────        │                                    │
│  Upgrade          │                                    │
│  Settings         │                                    │
│  Logout           │                                    │
└────────────────────────────────────────────────────────┘
```

### Tool Cards
Each tool card shows:
- Tool icon (custom SVG)
- Tool name
- One-line description
- Usage today (X / daily limit)
- "Open Tool" button

---

## 🔄 Build Order (Recommended for Copilot)

### Phase 1 — Foundation (Build First)
1. Project setup: Vite + React + TypeScript + Tailwind
2. Design system: CSS variables + shared components
3. App shell: sidebar navigation + routing
4. Dashboard page with tool card grid
5. Auth pages: Login / Signup / Forgot Password (UI only)

### Phase 2 — Tool UIs (No API, Mock Data)
Build each tool in this order (easiest → most complex):
1. `07` Letter Writer
2. `05` Document Summarizer
3. `09` Caption Generator
5. `06` AI Translator
7. `10` Invoice Generator
9. `04` Resume Builder
10. `08` Presentation Builder
11. `11` Study Guide + Quiz

### Phase 2b — PRO Upload Feature (After All Tool UIs Done)
1. Build shared `UploadZone` component with all visual states
2. Build `RevisionBadge` component (all variants)
3. Build `DiffViewer` component (original vs revised side-by-side)
4. Add `Step0_UploadOrStart` gate to Resume Builder (flagship)
5. Add `UploadZone` to Tools 01, 02, 07, 08, 09, 10, 11
6. Wire client-side .txt/.md parsing (no API needed)
7. Wire mammoth.js for .docx client-side parsing
8. Stub PDF parsing (Worker in Phase 4)
9. Lock upload zones on free tier with PRO badge + upgrade prompt

### Phase 3 — Platform Features
1. Usage tracking UI (limits + bars)
2. Saved outputs system (list + delete)
3. User settings page
4. Upgrade prompts + pricing page
5. History/recent outputs per tool

### Phase 4 — API Integration (Last)
1. Cloudflare Workers setup
2. Claude API integration (all text tools)
3. Microsoft Translator API (Tool 06)
5. Stripe billing integration
6. Clerk auth integration
7. D1 database connection
8. R2 file storage
9. KV usage tracking

---

## 🚫 Global Constraints & Rules

1. **No legal advice** — no tools that generate legal documents with legal weight
2. **No medical advice** — no health-related output tools
3. **No financial advice** — invoice calculations only, no tax filing assistance
4. **All AI outputs** marked with "AI-generated — review before use"
5. **No URL scraping** — text paste and file upload only
6. **Privacy first** — input text never persisted without explicit user save action
7. **Content moderation** — profanity filter on all inputs
8. **Accessibility** — WCAG 2.1 AA minimum on all components
9. **API stubbing** — all API calls stubbed during Phase 1–3 build, clearly documented
10. **Mobile-first** — every tool responsive to 320px minimum width

---

## ✅ Platform Definition of Done

- [ ] All 11 tools fully functional with mock data
- [ ] Shared component library complete and documented
- [ ] Dashboard renders all 11 tool cards correctly
- [ ] Navigation routes to all tool pages
- [ ] Usage limit UI shows and blocks at limit (mocked)
- [ ] Upgrade prompt modal appears when limit hit
- [ ] Settings page functional (profile edit, password change)
- [ ] Pricing page with all 4 tiers
- [ ] All tools responsive on mobile/tablet/desktop
- [ ] All API service files stubbed with clear integration comments
- [ ] Error states handled on all tools
- [ ] Loading states (skeletons) on all tools
- [ ] Empty states on dashboard and saved outputs
- [ ] Accessibility: keyboard nav, focus states, screen reader labels
