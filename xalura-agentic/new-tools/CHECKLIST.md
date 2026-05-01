my f# 🏗️ XALURA NEW TOOLS — MASTER CHECKLIST

## 📐 Architecture Decisions
- [x] Build INSIDE existing Next.js app (NOT new Vite project)
- [x] Use existing dark theme + Tailwind config
- [x] Use existing `/ai-tools/` route structure
- [x] Service stubs (1.5s delay mock data)
- [x] No Clerk, no Stripe, no Workers (skip per instructions)
- [x] Leave agentic pipeline alone
- [x] Leave existing email/content/report tools alone

---

## 🔵 PHASE 0 — Foundation (Directory Structure)

### Create app routes
- [ ] `app/ai-tools/resume/page.tsx`
- [ ] `app/ai-tools/summarizer/page.tsx`
- [ ] `app/ai-tools/translator/page.tsx`
- [ ] `app/ai-tools/letter/page.tsx`
- [ ] `app/ai-tools/presentation/page.tsx`
- [ ] `app/ai-tools/captions/page.tsx`
- [ ] `app/ai-tools/invoice/page.tsx`
- [ ] `app/ai-tools/study/page.tsx`
- [ ] `app/pricing/page.tsx`
- [ ] `app/settings/page.tsx`
- [ ] `app/outputs/page.tsx`

### Create lib/services/ — API stubs
- [ ] `lib/services/summarizerService.ts`
- [ ] `lib/services/captionService.ts`
- [ ] `lib/services/translatorService.ts`
- [ ] `lib/services/letterService.ts`
- [ ] `lib/services/invoiceService.ts`
- [ ] `lib/services/resumeService.ts`
- [ ] `lib/services/presentationService.ts`
- [ ] `lib/services/studyService.ts`

### Create lib/data/ — Tool config
- [ ] `lib/data/tools.ts` — all 8 tools metadata (icon, color, route, tier, etc.)

### Create lib/hooks/
- [ ] `lib/hooks/useUsageLimit.ts` — mock usage tracking
- [ ] `lib/hooks/useUpgradeModal.ts` — modal state management

---

## 🔵 PHASE 1 — Shared Components (Build Once, Use Everywhere)

### Core UI
- [ ] `components/shared/SplitPanel.tsx` — left input / right output layout
- [ ] `components/shared/Button.tsx` — Primary, Secondary, Ghost variants
- [ ] `components/shared/TextInput.tsx` — Label + input + error
- [ ] `components/shared/TextArea.tsx` — Label + textarea + char count
- [ ] `components/shared/SelectInput.tsx` — Label + select + options
- [ ] `components/shared/LoadingSkeleton.tsx` — Shimmer placeholder
- [ ] `components/shared/EmptyState.tsx` — Icon + message + optional CTA
- [ ] `components/shared/Toast.tsx` — Success/error/notification toast
- [ ] `components/shared/Modal.tsx` — Overlay + content + close

### PRO Components
- [ ] `components/shared/UploadZone.tsx` — Drag-drop file upload
- [ ] `components/shared/RevisionBadge.tsx` — "REVISED BY AI" badge
- [ ] `components/shared/DiffViewer.tsx` — Original vs revised side-by-side

### Platform
- [ ] `components/shared/UpgradeModal.tsx` — 3-tier upgrade prompt
- [ ] `components/shared/UsageLimitBar.tsx` — X/5 daily limit bar
- [ ] `components/shared/OutputActions.tsx` — Copy/Export/Save buttons

---

## 🔵 PHASE 2 — Tool UIs (Simplest → Most Complex)

### ✅ 2.1 — Letter Writer (`/ai-tools/letter`)
**Complexity: Easy** | Form → Preview
- [ ] Page shell (`app/ai-tools/letter/page.tsx`)
- [ ] Category selector (8 letter types)
- [ ] Letter form (sender, recipient, key points, tone, length)
- [ ] Paper preview (realistic letter rendering)
- [ ] Generate button → service stub
- [ ] Output actions: Copy, Print, Export
- [ ] Loading skeleton, error state, empty state

### ✅ 2.2 — Document Summarizer (`/ai-tools/summarizer`)
**Complexity: Easy-Medium** | Textarea → Tabs
- [ ] Page shell
- [ ] Input zone (textarea + file drop)
- [ ] Summary controls (length, format, focus, audience)
- [ ] Output tabs (Summary / Key Points / Takeaways / Q&A)
- [ ] Stats panel (compression meter, time saved, word count)
- [ ] Compression meter animation
- [ ] Loading skeleton, error state, empty state

### ✅ 2.3 — Caption Generator (`/ai-tools/captions`)
**Complexity: Medium** | Multi-select → Platform previews
- [ ] Page shell
- [ ] Input panel (describer, business type, goal, tone chips, hashtags, emoji, CTA)
- [ ] Platform selector (Instagram, FB, TikTok, LinkedIn, X, YouTube)
- [ ] Platform previews (realistic mockups per platform)
- [ ] 3 variant carousel
- [ ] Batch mode (all platforms at once)
- [ ] Char limit bar
- [ ] Hashtag group display

### ✅ 2.4 — AI Translator (`/ai-tools/translator`)
**Complexity: Medium** | Language selectors → Side-by-side
- [ ] Page shell
- [ ] Language bar (source + target + swap + auto-detect)
- [ ] Source panel (textarea + stats + clear)
- [ ] Target panel (translated text + TTS + copy)
- [ ] Language bridge animation
- [ ] Document mode (upload .txt)
- [ ] Phrasebook drawer
- [ ] RTL support for Arabic/Hebrew

### ✅ 2.5 — Invoice Generator (`/ai-tools/invoice`)
**Complexity: Medium-Hard** | Forms + live preview + calculations
- [ ] Page shell
- [ ] Mode selector (Invoice / Business Letter)
- [ ] Invoice builder (business info, client, line items, tax, discount, notes)
- [ ] Dynamic line items table (add/remove/reorder/auto-calc)
- [ ] Running total ticker animation
- [ ] Live A4 preview (real-time)
- [ ] Branding setup (logo + color)
- [ ] Business letter mode
- [ ] Business profile save/load

### ✅ 2.6 — Study Guide + Quiz (`/ai-tools/study`)
**Complexity: Medium** | Text → Flashcards + Quiz
- [ ] Page shell
- [ ] Input section (paste text + source type + complexity)
- [ ] 3 tabs: Study Guide / Flashcards / Quiz
- [ ] Study guide (overview, concepts, key terms, tips)
- [ ] Flashcards (3D flip animation, "Got it" / "Study again")
- [ ] Quiz (multiple choice, true/false, scoring, explanations)
- [ ] Spaced repetition queue

### ✅ 2.7 — Presentation Builder (`/ai-tools/presentation`)
**Complexity: Hard** | Input → Filmstrip + Slide preview
- [ ] Page shell
- [ ] Input panel (topic, audience, tone, slide count, sections)
- [ ] Slide preview (full-size rendered slide)
- [ ] Filmstrip (vertical thumbnails, reorderable)
- [ ] 7 slide layouts (Title, Content, Two-Column, Quote, Stats, Agenda, Closing)
- [ ] Speaker notes panel
- [ ] Slide navigation (prev/next/keyboard)

### ✅ 2.8 — Resume Builder (`/ai-tools/resume`)
**Complexity: Hardest** | 5-step wizard + live preview + ATS gauge
- [ ] Page shell
- [ ] Step 0: Upload or Start Fresh (flagship PRO gate)
- [ ] Step 1: Personal Info
- [ ] Step 2: Work Experience (add/remove jobs, bullet enhancer)
- [ ] Step 3: Education & Certs
- [ ] Step 4: Skills (tags + categories + proficiency)
- [ ] Step 5: Job Target (JD paste + keyword matching)
- [ ] Live resume preview (updates per step)
- [ ] ATS Score Gauge (animated, color shifts red→green)
- [ ] 4 resume templates
- [ ] Cover letter tab
- [ ] Export: PDF download, copy text

---

## 🔵 PHASE 2B — PRO Upload (After All 8 Tools)

- [ ] UploadZone component works with drag-drop
- [ ] .txt / .md client-side parsing via FileReader
- [ ] .docx parsing via mammoth.js
- [ ] .pdf parsing stubbed
- [ ] RevisionBadge component (all 4 variants)
- [ ] DiffViewer component (side-by-side)
- [ ] Resume Builder Step 0 upload gate
- [ ] Locked upload zones on tools (free tier)

---

## 🔵 PHASE 3 — Platform Features

### Dashboard (`/`)
- [ ] Tool card grid (all 8 tools)
- [ ] Welcome banner
- [ ] Usage summary bars
- [ ] Recent outputs section
- [ ] Quick actions (3 most-used tools)

### Pricing (`/pricing`)
- [ ] 4 tier cards (Free / Starter $12 / Pro $29 / Agency $79)
- [ ] Annual toggle (30% off)
- [ ] Feature comparison table

### Settings (`/settings`)
- [ ] Profile tab (name, email, avatar)
- [ ] Billing tab (current plan, usage summary)
- [ ] Preferences tab (default language, tone)

### Saved Outputs (`/outputs`)
- [ ] Grid of saved output cards
- [ ] Filter bar
- [ ] Delete with confirmation
- [ ] Empty state

---

## 🚩 Endgame
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] All 8 tools render with full mock UI
- [ ] All shared components work correctly
- [ ] SplitPanel layout on all tools (desktop)
- [ ] Loading skeletons on all tools
- [ ] Error states on all tools
- [ ] Empty states on all tools
- [ ] Copy / Export / Save buttons on outputs
- [ ] Usage limit bars + upgrade modal chain
- [ ] Pricing page renders correctly
- [ ] Settings page renders correctly
- [ ] Saved outputs renders correctly
- [ ] Mobile-responsive (320px+)
- [ ] Commit + push
