# Tool 00 — Dashboard + App Shell
**Platform:** AI Toolkit | **Stack:** Cloudflare Pages | **Framework:** React + TypeScript + React Router

---

## 🎯 Purpose
The central hub of the platform. Users land here after login, see all 11 tools, their usage stats, recent outputs, and quick-access shortcuts. The app shell (sidebar + routing) wraps every tool page.

---

## 🎨 Design Direction
**Aesthetic:** Dark command center — near-black (#0a0a0f), surface cards (#13131a), violet accent (#7c3aed), clean white text. Subtle animated gradient orb in background (position: fixed, pointer-events: none). Feels premium, focused, powerful.

**Unforgettable Element:** Tool cards have a "pulse ring" animation on hover — like a sonar ping radiating outward from the card. Each tool has a unique icon color so the grid feels alive and distinct, not uniform.

**Layout:** Fixed left sidebar (240px) + main content area. Sidebar collapses to icon-only (64px) on smaller screens.

---

## 🧱 Component Architecture

```
App/
├── main.tsx                          # React entry point
├── App.tsx                           # Router + auth wrapper
├── routes.tsx                        # All route definitions
│
├── shell/
│   ├── AppShell.tsx                  # Layout wrapper (sidebar + main)
│   ├── Sidebar/
│   │   ├── Sidebar.tsx               # Main navigation sidebar
│   │   ├── SidebarLogo.tsx           # Brand logo + wordmark
│   │   ├── SidebarNav.tsx            # Tool navigation links
│   │   ├── SidebarNavItem.tsx        # Individual nav item
│   │   ├── SidebarUsageWidget.tsx    # Mini usage bar in sidebar
│   │   ├── SidebarUpgradeCard.tsx    # Upgrade CTA card at bottom
│   │   └── SidebarCollapseBtn.tsx    # Toggle collapse
│   └── TopBar/
│       ├── TopBar.tsx                # Optional top bar for tool pages
│       └── UserMenu.tsx             # Avatar + dropdown menu
│
├── pages/
│   ├── Dashboard/
│   │   ├── Dashboard.tsx             # Main dashboard page
│   │   ├── WelcomeBanner.tsx         # Greeting + date
│   │   ├── UsageSummary.tsx          # This month's usage overview
│   │   ├── ToolGrid.tsx              # 11 tool cards in grid
│   │   ├── ToolCard.tsx              # Individual tool card
│   │   ├── RecentOutputs.tsx         # Last 5 saved outputs
│   │   ├── RecentOutputItem.tsx      # Individual output row
│   │   └── QuickActions.tsx          # 3 most-used tools shortcuts
│   ├── Pricing/
│   │   ├── Pricing.tsx               # Pricing page
│   │   ├── PricingCard.tsx           # Individual tier card
│   │   └── FeatureCompare.tsx        # Full feature comparison table
│   ├── Settings/
│   │   ├── Settings.tsx              # Settings page
│   │   ├── ProfileSettings.tsx       # Name, email, avatar
│   │   ├── BillingSettings.tsx       # Plan, invoices, upgrade/cancel
│   │   └── PreferenceSettings.tsx    # Default language, theme
│   ├── Auth/
│   │   ├── Login.tsx                 # Login page
│   │   ├── Signup.tsx                # Signup page
│   │   └── ForgotPassword.tsx        # Password reset
│   └── Outputs/
│       ├── SavedOutputs.tsx          # All saved outputs page
│       ├── OutputCard.tsx            # Saved output card
│       └── OutputDetail.tsx          # Full output view
│
└── components/shared/               # (documented in MASTER-README)
```

---

## ⚙️ Route Definitions

```typescript
// routes.tsx
const routes = [
  { path: '/',                  element: <Dashboard /> },
  { path: '/tools/resume',      element: <ResumeBuilder /> },
  { path: '/tools/summarizer',  element: <DocumentSummarizer /> },
  { path: '/tools/translator',  element: <AITranslator /> },
  { path: '/tools/letter',      element: <LetterWriter /> },
  { path: '/tools/presentation',element: <PresentationBuilder /> },
  { path: '/tools/captions',    element: <CaptionGenerator /> },
  { path: '/tools/invoice',     element: <InvoiceGenerator /> },
  { path: '/tools/study',       element: <StudyGuide /> },
  { path: '/outputs',           element: <SavedOutputs /> },
  { path: '/pricing',           element: <Pricing /> },
  { path: '/settings',          element: <Settings /> },
  { path: '/login',             element: <Login /> },
  { path: '/signup',            element: <Signup /> },
]
```

---

## 🃏 Tool Card Config

```typescript
// /data/tools.ts — single source of truth for all tool metadata

export const TOOLS: ToolConfig[] = [
  {
    id: 'email',
    description: 'Professional emails for any situation',
    icon: '✉️',
    iconColor: '#3b82f6',      // blue
    route: '/tools/email',
    tier: 'free',
    hasUpload: true,
    badge: null,
  },
  {
    id: 'article',
    description: 'Blog posts, news articles, how-to guides',
    icon: '📰',
    iconColor: '#10b981',      // green
    route: '/tools/article',
    tier: 'free',
    hasUpload: true,
    badge: null,
  },
  {
    description: 'Invoices, proposals, certificates & more',
    icon: '📄',
    iconColor: '#ef4444',      // red
    route: '/tools/pdf',
    tier: 'free',
    hasUpload: false,
    badge: null,
  },
  {
    id: 'resume',
    name: 'Resume Builder',
    description: 'ATS-optimized resumes & cover letters',
    icon: '🧑‍💼',
    iconColor: '#a855f7',      // purple
    route: '/tools/resume',
    tier: 'starter',
    hasUpload: true,
    badge: 'POPULAR',
  },
  {
    id: 'summarizer',
    name: 'Document Summarizer',
    description: 'Compress any document into key insights',
    icon: '🔍',
    iconColor: '#f59e0b',      // amber
    route: '/tools/summarizer',
    tier: 'free',
    hasUpload: true,
    badge: null,
  },
  {
    id: 'translator',
    name: 'AI Translator',
    description: 'Translate across 130+ languages',
    icon: '🌐',
    iconColor: '#06b6d4',      // cyan
    route: '/tools/translator',
    tier: 'free',
    hasUpload: false,
    badge: null,
  },
  {
    id: 'letter',
    name: 'Letter Writer',
    description: 'Any letter for any occasion',
    icon: '✍️',
    iconColor: '#c084fc',      // light purple
    route: '/tools/letter',
    tier: 'free',
    hasUpload: true,
    badge: null,
  },
  {
    id: 'presentation',
    name: 'Presentation Builder',
    description: 'Full slide decks from any topic',
    icon: '📊',
    iconColor: '#f97316',      // orange
    route: '/tools/presentation',
    tier: 'starter',
    hasUpload: true,
    badge: null,
  },
  {
    id: 'captions',
    name: 'Caption Generator',
    description: 'Social captions for every platform',
    icon: '📱',
    iconColor: '#ec4899',      // pink
    route: '/tools/captions',
    tier: 'free',
    hasUpload: true,
    badge: null,
  },
  {
    id: 'invoice',
    name: 'Invoice Generator',
    description: 'Professional invoices & business letters',
    icon: '🧾',
    iconColor: '#84cc16',      // lime
    route: '/tools/invoice',
    tier: 'starter',
    hasUpload: true,
    badge: null,
  },
  {
    id: 'study',
    name: 'Study Guide + Quiz',
    description: 'Study guides, flashcards & quizzes',
    icon: '🎓',
    iconColor: '#facc15',      // yellow
    route: '/tools/study',
    tier: 'free',
    hasUpload: true,
    badge: 'NEW',
  },
]
```

---

## 📦 Dashboard State

```typescript
interface DashboardState {
  user: UserProfile;
  usageSummary: Record<string, { used: number; limit: number }>;
  recentOutputs: SavedOutput[];
  mostUsedTools: string[];        // tool IDs sorted by usage
  isLoading: boolean;
}
```

---

## 🎬 Dashboard Animations

- **Page load:** Tool cards stagger in (50ms delay each), top-left to bottom-right
- **Tool card hover:** Sonar pulse ring radiates outward from card center, 600ms, fades out
- **Usage bars:** Animate from 0 to actual value on first render, 800ms ease-out
- **Recent outputs:** Slide in from right, staggered 80ms each
- **Sidebar collapse:** Smooth width transition 240px→64px, labels fade out
- **Upgrade card:** Subtle gradient shimmer animation, loops every 4s

---

## 📐 Responsive Behavior
- **Desktop (>1200px):** Full sidebar 240px, 3-column tool grid
- **Tablet (768–1200px):** Sidebar collapses to icons 64px, 2-column tool grid
- **Mobile (<768px):** Sidebar hidden (hamburger menu), 1-column tool grid, bottom nav bar

---

## ✅ Definition of Done
- [ ] App shell renders with sidebar + main content area
- [ ] All 11 tool routes navigate correctly
- [ ] Dashboard shows tool card grid with all 11 tools
- [ ] Tool cards show correct icon, name, description, tier badge
- [ ] Hover pulse animation works on tool cards
- [ ] Usage summary bars render with mock data
- [ ] Recent outputs section shows mock items
- [ ] Sidebar collapse/expand works
- [ ] Pricing page shows all 4 tiers
- [ ] Settings page renders all 3 sections
- [ ] Auth pages (Login/Signup) render correctly
- [ ] Responsive layout correct on all breakpoints
- [ ] Mobile bottom nav bar works
