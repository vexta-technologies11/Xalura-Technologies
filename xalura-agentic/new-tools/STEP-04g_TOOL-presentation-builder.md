# Tool 08 — Presentation Builder
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages + R2 | **Framework:** React + TypeScript

---

## 🎯 Purpose
Turn any topic, notes, or outline into a full slide deck with multiple layout options. Designed for professionals, educators, students, and anyone who needs to create presentations quickly from raw ideas.

---

## 🎨 Design Direction
**Aesthetic:** Clean modern deck — near-white (#f8f9fa), deep indigo (#1a1a3e), coral accent (#ff6b6b). Typography: `Cabinet Grotesk` (headings), `Inter` (body). Feels like a pro presentation tool, not a slides app.

**Unforgettable Element:** Slide previews are rendered as actual mini slide thumbnails in a vertical filmstrip, and clicking one shows a full-size rendered slide with realistic shadows and aspect ratio. You feel like you're flipping through a finished deck before it's even exported.

**Layout:** Left input panel → Center main slide preview → Right filmstrip of all slides. Export bar at bottom.

---

## 🧱 Component Architecture

```
PresentationBuilder/
├── PresentationBuilder.tsx            # Root component
├── components/
│   ├── InputPanel/
│   │   ├── InputPanel.tsx             # Left panel — topic input
│   │   ├── TopicInput.tsx             # Presentation topic
│   │   ├── AudienceSelector.tsx       # Target audience
│   │   ├── ToneSelector.tsx           # Professional / Academic / Persuasive / Casual
│   │   ├── SlideCountSelector.tsx     # Number of slides (5-20)
│   │   ├── SectionsInput.tsx          # Optional: key sections/topics to cover
│   │   └── GenerateButton.tsx
│   ├── SlidePreview/
│   │   ├── SlidePreview.tsx           # Center panel — current slide
│   │   ├── SlideRenderer.tsx          # Renders individual slide with layout
│   │   ├── SlideLayouts/
│   │   │   ├── TitleSlide.tsx
│   │   │   ├── ContentSlide.tsx
│   │   │   ├── TwoColumnSlide.tsx
│   │   │   ├── QuoteSlide.tsx
│   │   │   ├── StatsSlide.tsx
│   │   │   ├── AgendaSlide.tsx
│   │   │   └── ClosingSlide.tsx
│   │   ├── SlideNavigation.tsx        # Prev/Next with keyboard support
│   │   └── SlideNotesPanel.tsx        # Speaker notes for current slide
│   ├── Filmstrip/
│   │   ├── Filmstrip.tsx              # Right sidebar — all slides
│   │   ├── SlideThumbnail.tsx         # Mini slide preview
│   │   ├── SlideReorder.tsx           # Drag-to-reorder slides
│   │   └── AddSlideButton.tsx         # Insert blank slide
│   └── ExportBar/
│       ├── ExportBar.tsx              # Bottom export strip
│       ├── ExportPDF.tsx
│       ├── ExportPPTX.tsx
│       └── CopyText.tsx
└── hooks/
    ├── usePresentationBuilder.ts      # Core logic + state
    ├── useSlideNavigation.ts          # Slide navigation
    ├── useSlideReorder.ts             # Drag reorder
    └── usePresentationExport.ts       # Export functions
```

---

## ⚙️ Feature Specifications

### Input Fields
| Field | Details |
|---|---|
| **Topic** | Main topic / title of presentation |
| **Purpose** | Inform / Persuade / Teach / Pitch / Report |
| **Audience** | General / Executives / Technical / Students / Customers |
| **Tone** | Professional / Academic / Persuasive / Casual / Inspirational |
| **Slide Count** | 5–20 slides |
| **Sections** | Optional: comma-separated key sections to include |

### Output Features
| Feature | Details |
|---|---|
| **7 Layout Types** | Title, Content, Two-Column, Quote, Stats, Agenda, Closing |
| **Full Preview** | Realistic slide rendering with shadows |
| **Filmstrip** | All slides as thumbnails, drag to reorder |
| **Speaker Notes** | Editable notes per slide |
| **Slide Edit** | Click any slide to edit content inline |

---

## 📦 State Management

```typescript
interface PresentationState {
  // Input
  topic: string;
  purpose: PresentationPurpose;
  audience: PresentationAudience;
  tone: PresentationTone;
  slideCount: number;
  customSections: string[];

  // Output
  slides: Slide[];
  currentSlideIndex: number;
  speakerNotes: Record<string, string>;

  // UI
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
}

interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  content: string[];
  notes: string;
  imageUrl?: string;
}
```

---

## ✅ Definition of Done
- [ ] Topic input generates mock slide deck
- [ ] Slide navigation (prev/next/keyboard) works
- [ ] All 7 slide layouts render correctly
- [ ] Filmstrip shows all slides as thumbnails
- [ ] Drag reorder works in filmstrip
- [ ] Speaker notes editable per slide
- [ ] Export buttons functional (mock)
- [ ] Responsive layout correct
