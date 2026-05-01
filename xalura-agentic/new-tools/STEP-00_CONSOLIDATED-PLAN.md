# 🎯 XALURA CONSOLIDATED BUILD PLAN
## Mapping Claude's Generic Spec → Our Next.js Architecture

---

## 🏗️ Architecture Decision: Use Existing Next.js App (NOT Vite SPA)

Claude's spec says "Vite + React + React Router". Our existing codebase is **Next.js App Router**. We build INSIDE the existing app.

**Why:**
- Auth middleware already exists (`middleware.ts`, `lib/auth/`)
- Dark theme styling already set in `tailwind.config.ts`
- Supabase database already wired
- Deployment (Cloudflare Pages via OpenNext) already configured
- `/ai-tools/` route structure already exists for email/content/report
- No need to rebuild auth, database, deployment, or design system

---

## 🔄 Route Mapping: Claude's Generic → Our Routes

| Claude's Route | Our Route | Notes |
|---|---|---|
| `/` (Dashboard) | `/tools` or keep existing home | Dashboard is new — we add it |
| `/tools/resume` | `/ai-tools/resume` | New page |
| `/tools/summarizer` | `/ai-tools/summarizer` | New page |
| `/tools/translator` | `/ai-tools/translator` | New page |
| `/tools/letter` | `/ai-tools/letter` | New page |
| `/tools/presentation` | `/ai-tools/presentation` | New page |
| `/tools/captions` | `/ai-tools/captions` | New page |
| `/tools/invoice` | `/ai-tools/invoice` | New page |
| `/tools/study` | `/ai-tools/study` | New page |
| `/pricing` | `/pricing` | New page |
| `/settings` | `/settings` | New page |
| `/outputs` | `/outputs` | New page |
| `/login`, `/signup` | Already exist in middleware | Reuse existing auth |

**Total new pages: 12** (8 tools + dashboard + pricing + settings + saved outputs)

---

## 🛠️ What We Keep From Claude's Spec

| Concept | How It Maps |
|---|---|
| **Split panel layout** (input left, output right) | New shared component `SplitPanel.tsx` |
| **Tailwind dark theme** (#0a0a0f, #13131a, #7c3aed) | Already match our existing theme |
| **All 8 tool UIs** | New pages under `/ai-tools/` |
| **Service stubs** (`/services/`) | New folder using the stub pattern |
| **Shared components** (Button, Input, Toast, Modal, etc.) | Build as new components using our existing UI primitives |
| **UploadZone, RevisionBadge, DiffViewer** | Build as new shared components |
| **Usage limit system** | New hook + UI (mock data, no backend) |
| **UpgradeModal** | New component (no Stripe — just UI) |
| **Pricing page** | New page (4 tiers, no Stripe) |
| **Settings page** | New page (3 tabs, mock data) |
| **Saved outputs page** | New page (local state, no DB) |

---

## 🗑️ What We Skip From Claude's Spec

| Feature | Why We Skip |
|---|---|
| **Clerk.dev auth** | Already have our own auth (Prisma/Supabase/middleware) |
| **Stripe billing** | "For later" per your instruction |
| **Cloudflare Workers API routes** | "Leave the agents alone" — tools use stubs |
| **D1 database** | We use Supabase. Build local state first |
| **R2 file storage** | PRO upload is mocked — no real storage yet |
| **Resend emails** | Already have Resend, but skip email flows for now |
| **Microsoft Translator** | Stub only — real integration is Phase 4 |
| **Claude API** | Stub only — real integration is Phase 4 |
| **PDF generation via Worker** | Mock button only |

---

## 🧱 Build Order (Our Version)

### Phase 1 — Shell & Shared Components
1. Create route structure under `/ai-tools/` for all 8 tools
2. Build shared components: SplitPanel, Button, TextInput, TextArea, SelectInput, Toast, LoadingSkeleton, EmptyState, Modal, UpgradeModal
3. Build app shell: sidebar + dashboard page with tool cards

### Phase 2 — Tool UIs (One at a Time)
Build in this order (simplest → most complex):
1. **Letter Writer** — simplest form → preview pattern
2. **Document Summarizer** — textarea in, tabs out
3. **Caption Generator** — multi-select, platform previews
4. **AI Translator** — language selectors, side-by-side panels
5. **Invoice Generator** — dynamic line items, calculations
6. **Study Guide + Quiz** — flashcards, quiz scoring
7. **Presentation Builder** — filmstrip, slide layouts
8. **Resume Builder** — wizard, ATS gauge, most complex

### Phase 2b — PRO Upload
- Build UploadZone, RevisionBadge, DiffViewer
- Add upload gate to Resume Builder (flagship)
- Add locked upload zones to other tools
- Wire mammoth.js for .docx parsing

### Phase 3 — Platform Features
- Usage limit system (mock)
- Pricing page (4 tiers)
- Settings page (3 tabs)
- Saved outputs page (local state)

---

## 📁 Folder Structure (Our Version)

```
app/
├── ai-tools/
│   ├── resume/
│   │   └── page.tsx              # ResumeBuilder page
│   ├── summarizer/
│   │   └── page.tsx              # DocumentSummarizer page
│   ├── translator/
│   │   └── page.tsx              # AITranslator page
│   ├── letter/
│   │   └── page.tsx              # LetterWriter page
│   ├── presentation/
│   │   └── page.tsx              # PresentationBuilder page
│   ├── captions/
│   │   └── page.tsx              # CaptionGenerator page
│   ├── invoice/
│   │   └── page.tsx              # InvoiceGenerator page
│   └── study/
│       └── page.tsx              # StudyGuide page
├── pricing/
│   └── page.tsx
├── settings/
│   └── page.tsx
└── outputs/
    └── page.tsx

components/
├── tools/                          # Tool-specific components
│   ├── LetterWriter/
│   ├── DocumentSummarizer/
│   ├── CaptionGenerator/
│   ├── AITranslator/
│   ├── InvoiceGenerator/
│   ├── ResumeBuilder/
│   ├── PresentationBuilder/
│   └── StudyGuide/
├── shared/                         # Shared UI components
│   ├── SplitPanel.tsx
│   ├── Button.tsx
│   ├── TextInput.tsx
│   ├── TextArea.tsx
│   ├── SelectInput.tsx
│   ├── Toast.tsx
│   ├── LoadingSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── Modal.tsx
│   ├── UpgradeModal.tsx
│   ├── UploadZone.tsx
│   ├── RevisionBadge.tsx
│   └── DiffViewer.tsx
├── dashboard/
│   ├── DashboardShell.tsx
│   ├── ToolCard.tsx
│   ├── UsageSummary.tsx
│   └── RecentOutputs.tsx
├── pricing/
│   ├── PricingCard.tsx
│   └── FeatureCompare.tsx
└── settings/
    ├── ProfileTab.tsx
    ├── BillingTab.tsx
    └── PreferencesTab.tsx

lib/
├── services/                       # API stubs
│   ├── summarizerService.ts
│   ├── captionService.ts
│   ├── translatorService.ts
│   ├── letterService.ts
│   ├── invoiceService.ts
│   ├── resumeService.ts
│   ├── presentationService.ts
│   └── studyService.ts
├── hooks/
│   ├── useUsageLimit.ts
│   └── useUpgradeModal.ts
└── data/
    └── tools.ts                    # Tool config metadata
```

---

## 🎨 Design Notes

Claude's color palette (#0a0a0f bg, #13131a surface, #1f1f2e border, #7c3aed accent) **already matches our existing theme**. We use the existing Tailwind config. No design system rebuild needed.

Each tool gets its own "flavor" color per Claude's spec (e.g., summarizer = forest green, captions = electric pink, translator = ocean blue). These are applied per-tool via CSS variables or Tailwind classes, not globally.

---

## 🔌 Service Stub Pattern

Every tool page calls a service function from `/lib/services/` that returns mock data after a 1.5s delay. This lets us build the entire UI without any backend. In the future, these stubs get replaced with real API calls.

```typescript
// /lib/services/resumeService.ts
export async function generateResume(params: ResumeParams): Promise<ResumeOutput> {
  await new Promise(r => setTimeout(r, 1500));
  return { title: 'Mock Resume', sections: [], atsScore: 78 };
}
```

---

## ✅ Done When
- [ ] All 8 tool pages render with full mock UI under `/ai-tools/`
- [ ] SplitPanel layout works on every tool (input left, output right)
- [ ] Loading skeletons, error states, empty states on all tools
- [ ] Copy / Export / Save buttons on all outputs
- [ ] PRO upload zones work (locked on free, open on Starter+ mock)
- [ ] REVISED BY AI badge + DiffViewer functional
- [ ] Usage limit bars show in all tools
- [ ] UpgradeModal triggers on limit hit or locked PRO feature
- [ ] Dashboard page with tool cards
- [ ] Pricing page with 4 tiers
- [ ] Settings page with 3 tabs
- [ ] Saved outputs page with mock data
- [ ] Zero TypeScript errors
