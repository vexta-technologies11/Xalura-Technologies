# COPILOT BUILD PROMPT — AI Toolkit Platform
> Feed this file to GitHub Copilot, Cursor, or any AI coding assistant as the project brief.
> All spec files in this folder are the detailed blueprints. This file is the entry point.

---

## 🎯 What You Are Building

A multi-tool AI SaaS platform with 11 productivity tools, a shared dashboard, authentication, billing, and a PRO file upload & rewrite system. Built on React + TypeScript, deployed on Cloudflare Pages + Workers.

This is a **phased build**. APIs are stubbed in Phase 1–3. Real API integration happens last in Phase 4.

---

## 📁 Read These Spec Files First (In Order)

```
00-MASTER-README.md          ← START HERE. Full architecture overview.
00b-dashboard-app-shell.md   ← App shell, routing, dashboard, tool cards.
13-pro-file-upload-rewrite.md ← PRO upload feature. Read before building tools.
01-email-writer.md
02-article-writer.md
03-pdf-maker.md
04-resume-builder.md         ← Most complex. Flagship upload feature.
05-document-summarizer.md
06-ai-translator.md
07-letter-writer.md
08-presentation-builder.md
09-caption-generator.md
10-invoice-generator.md
11-study-guide-quiz.md
12-cloudflare-workers-api.md ← Phase 4 only. Do not build until all UI done.
```

---

## 🏗️ Exact Build Order

### Phase 1 — Project Foundation
```bash
# 1. Init project
npm create vite@latest ai-toolkit -- --template react-ts
cd ai-toolkit
npm install

# 2. Install core dependencies
npm install react-router-dom @tanstack/react-query
npm install tailwindcss @tailwindcss/forms
npm install framer-motion          # animations
npm install lucide-react           # icons
npm install mammoth                # .docx parsing (for upload feature)
npm install clsx                   # conditional classnames

# 3. Dev dependencies  
npm install -D typescript @types/react @types/react-dom
```

**Build in this order:**
1. `tailwind.config.ts` — apply design system tokens from MASTER-README
2. `src/App.tsx` — router setup with all routes from `00b-dashboard-app-shell.md`
3. `src/shell/` — Sidebar + AppShell layout
4. `src/components/shared/` — ALL shared components (Button, Input, Toast, Skeleton, Modal, UploadZone, RevisionBadge, DiffViewer)
5. `src/pages/Dashboard/` — full dashboard with tool cards
6. `src/data/tools.ts` — tool config array (from `00b-dashboard-app-shell.md`)
7. Auth pages (Login, Signup) — UI only, no real auth yet

### Phase 2 — Tool UIs (Build in This Order)
Each tool: read its `.md` spec → build all components → wire mock state → stub API service file.

**Easiest first:**
1. `07-letter-writer.md`
2. `05-document-summarizer.md`
3. `09-caption-generator.md`
4. `01-email-writer.md`
5. `06-ai-translator.md`
6. `03-pdf-maker.md`
7. `10-invoice-generator.md`
8. `02-article-writer.md`
9. `04-resume-builder.md`
10. `08-presentation-builder.md`
11. `11-study-guide-quiz.md`

### Phase 2b — PRO Upload Feature
After ALL 11 tool UIs are done:
1. Build `UploadZone` shared component (states: idle, drag, loading, success, error)
2. Build `RevisionBadge` component (all variants)
3. Build `DiffViewer` component
4. Add `Step0_UploadOrStart` to Resume Builder
5. Add locked `UploadZone` to all applicable tools (01,02,07,08,09,10,11)
6. Wire client-side .txt/.md/.docx parsing (mammoth for docx)
7. Stub PDF upload (returns mock parsed text)

### Phase 3 — Platform Features
1. Usage limit tracking UI (bars + blocked state)
2. Upgrade modal (triggers when free user hits limit or clicks locked PRO feature)
3. Pricing page (4 tiers, annual toggle, feature comparison table)
4. Settings page (profile, billing, preferences)
5. Saved outputs system
6. Toast notification system

### Phase 4 — API Integration (Last)
Read `12-cloudflare-workers-api.md` fully before starting.
1. Cloudflare Workers project setup (wrangler)
2. Replace all stubbed service files with real API calls
3. Claude API for all text generation tools
4. Microsoft Translator API for Tool 06
5. APITemplate.io for PDF generation (Tools 03, 10)
6. Clerk auth integration
7. Stripe billing
8. D1 database
9. R2 file storage
10. KV usage tracking

---

## 🎨 Design Rules (Apply Everywhere)

```typescript
// Every component must follow these rules:

// 1. Dark theme only — no light mode toggle in Phase 1-3
// Background: #0a0a0f  Surface: #13131a  Border: #1f1f2e

// 2. Accent color is violet: #7c3aed
// Success: #10b981  Warning: #f59e0b  Error: #ef4444

// 3. Every tool has a SPLIT PANEL layout on desktop (>1024px)
// Input/controls on LEFT, output/preview on RIGHT

// 4. Every tool has a loading skeleton — never show empty white space

// 5. Every tool output has action buttons: Copy / Export / Save

// 6. PRO features show a locked state with gold badge when on free tier
// Clicking locked feature → UpgradeModal opens

// 7. "REVISED BY AI" badge appears on ALL upload-mode outputs

// 8. Mobile: ALL tools work on 320px minimum width
```

---

## 🔌 API Stub Pattern (Use For Every Tool)

```typescript
// CORRECT — how every service file should look during Phase 1-3

// src/services/emailService.ts
export async function generateEmail(params: EmailParams): Promise<EmailVariant[]> {
  // ============================================
  // STUB: Returns mock data during development
  // REPLACE IN PHASE 4 with real Cloudflare Worker call:
  // POST /api/tools/email-writer
  // ============================================
  
  await new Promise(resolve => setTimeout(resolve, 1500)); // simulate API delay
  
  return [
    {
      id: '1',
      subject: ['Mock Subject Line Option 1', 'Mock Subject Option 2', 'Mock Subject Option 3'],
      body: `Dear ${params.recipient},\n\nThis is a mock generated email body for the ${params.purpose} purpose with a ${params.tone}/5 tone level.\n\nBest regards,\n[Your Name]`,
      wordCount: 45,
      readTime: '< 1 min',
      generatedAt: new Date(),
    },
    // ... 2 more variants
  ];
}
```

---

## ⚠️ Hard Rules — Never Violate

1. **Never call a real API in Phase 1-3.** All service files return mock data.
2. **Never use localStorage in React components.** Use React state only. localStorage only in service files where explicitly noted.
3. **Never create separate CSS files.** Use Tailwind utility classes only.
4. **Never use `any` TypeScript type.** Every interface must be properly typed.
5. **Never build Phase 4 (Workers) until all 11 tool UIs pass their Definition of Done.**
6. **Every tool must have:** loading skeleton, error state, empty state, and mobile layout.
7. **Upload zones on free tier must show locked state** — never let free users initiate upload.
8. **All AI outputs must show** "AI-generated — review before use" disclaimer text.

---

## 📐 Folder Structure

```
src/
├── App.tsx
├── main.tsx
├── routes.tsx
├── data/
│   └── tools.ts               # Tool config (from 00b spec)
├── types/
│   ├── user.ts
│   ├── tools.ts
│   └── api.ts
├── shell/
│   ├── AppShell.tsx
│   ├── Sidebar/
│   └── TopBar/
├── pages/
│   ├── Dashboard/
│   ├── Pricing/
│   ├── Settings/
│   ├── Auth/
│   └── Outputs/
├── tools/
│   ├── EmailWriter/
│   ├── ArticleWriter/
│   ├── PDFMaker/
│   ├── ResumeBuilder/
│   ├── DocumentSummarizer/
│   ├── AITranslator/
│   ├── LetterWriter/
│   ├── PresentationBuilder/
│   ├── CaptionGenerator/
│   ├── InvoiceGenerator/
│   └── StudyGuide/
├── components/
│   └── shared/
│       ├── Button/
│       ├── Input/
│       ├── Feedback/
│       ├── Layout/
│       ├── Cards/
│       ├── Modals/
│       ├── UploadZone/        # PRO upload feature
│       ├── RevisionBadge/     # PRO upload feature
│       └── DiffViewer/        # PRO upload feature
├── services/
│   ├── emailService.ts        # STUB → real in Phase 4
│   ├── articleService.ts
│   ├── pdfService.ts
│   ├── resumeService.ts
│   ├── summarizerService.ts
│   ├── translatorService.ts
│   ├── letterService.ts
│   ├── presentationService.ts
│   ├── captionService.ts
│   ├── invoiceService.ts
│   ├── studyService.ts
│   └── uploadService.ts       # File parsing + PRO rewrite stub
├── hooks/
│   └── useUpgradeModal.ts     # Global upgrade prompt hook
└── utils/
    ├── fileParser.ts          # Client-side file text extraction
    ├── wordCount.ts
    └── formatters.ts
```

---

## ✅ Platform Is Ready When

- [ ] All 11 tool pages render with full mock UI
- [ ] Dashboard shows all tools, usage, recent outputs
- [ ] PRO upload zones appear in 9 tools (locked on free, functional on Starter+)
- [ ] REVISED BY AI badge and DiffViewer work on upload outputs
- [ ] Upgrade modal triggers on locked features and usage limits
- [ ] Pricing page shows 4 tiers with correct feature lists
- [ ] All tools responsive to 320px
- [ ] All 14 API service files stubbed with clear Phase 4 comments
- [ ] TypeScript: zero `any` types, zero build errors
- [ ] Tailwind: no custom CSS files, design tokens consistent
