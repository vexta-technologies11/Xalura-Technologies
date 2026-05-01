# Tool 05 — Document Summarizer
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages | **Framework:** React + TypeScript

---

## 🎯 Purpose
Paste any long document, report, article, contract, or text — get a structured, clear summary in seconds. Serves students, professionals, seniors, researchers, and anyone who needs to quickly understand long content without reading every word.

---

## 🎨 Design Direction
**Aesthetic:** Warm academic — parchment tones (#f8f3e8), forest green (#1a4a2e), brass gold (#b8952a). Typography: `Cormorant Garamond` (large display), `IBM Plex Sans` (UI + output). Feels like a smart reading companion, not a tech tool.

**Unforgettable Element:** A "Compression Meter" — a visual that shows the original document word count shrinking down to summary size, animated as a liquid filling/draining in a container. Shows "You saved X minutes of reading."

**Layout:** Top = document input (large textarea or file drop zone). Below = output zone with tabbed summary formats. Right sidebar = document stats + compression meter.

---

## 🧱 Component Architecture

```
DocumentSummarizer/
├── DocumentSummarizer.tsx            # Root component
├── components/
│   ├── InputZone/
│   │   ├── InputZone.tsx             # Input container
│   │   ├── TextPasteArea.tsx         # Large textarea for paste
│   │   ├── DropZone.tsx              # Drag-drop file upload area
│   │   ├── FileTypeIndicator.tsx     # Shows accepted: TXT, MD, DOCX
│   │   ├── InputStats.tsx            # Live word count, char count
│   │   └── ClearButton.tsx           # Clear input with confirm
│   ├── SummaryControls/
│   │   ├── SummaryControls.tsx       # Control bar between input/output
│   │   ├── LengthSelector.tsx        # Brief / Standard / Detailed
│   │   ├── FormatSelector.tsx        # Bullets / Paragraphs / Q&A / Outline
│   │   ├── FocusSelector.tsx         # What to focus on: key facts / action items / conclusions
│   │   ├── AudienceSelector.tsx      # General / Expert / Simple (for non-native speakers/seniors)
│   │   └── SummarizeButton.tsx       # CTA with compression animation
│   ├── OutputZone/
│   │   ├── OutputZone.tsx            # Summary output container
│   │   ├── SummaryTabs.tsx           # Tabs: Summary / Key Points / Takeaways / Q&A
│   │   ├── SummaryContent.tsx        # Rendered summary text
│   │   ├── KeyPointsList.tsx         # Bullet key points
│   │   ├── TakeawayCards.tsx         # Card-based key takeaways
│   │   ├── QASection.tsx             # Q&A format output
│   │   └── OutputActions.tsx         # Copy / Export / Save
│   ├── StatsPanel/
│   │   ├── StatsPanel.tsx            # Right sidebar
│   │   ├── CompressionMeter.tsx      # Animated liquid compression visual
│   │   ├── TimeSaved.tsx             # "You saved X min of reading"
│   │   ├── WordCountCompare.tsx      # Original vs Summary word count
│   │   ├── SentimentBadge.tsx        # Positive / Neutral / Critical tone badge
│   │   └── TopicTags.tsx             # Auto-detected topic tags
│   └── HistoryPanel/
│       ├── HistoryPanel.tsx          # Slide-out history drawer
│       ├── HistoryItem.tsx           # Past summary card
│       └── HistorySearch.tsx         # Search past summaries
└── hooks/
    ├── useDocumentSummarizer.ts      # Core logic + state
    ├── useFileParser.ts              # Client-side file text extraction
    ├── useCompressionStats.ts        # Word count + time calculations
    └── useSummaryHistory.ts          # Local history management
```

---

## ⚙️ Feature Specifications

### Input Features
| Feature | Details |
|---|---|
| **Text Paste** | Large textarea, min 100 words required |
| **File Drop** | Drag-drop or click — accepts .txt and .md (DOCX in final phase) |
| **Live Word Count** | Updates as user types/pastes |
| **Input Limit** | Free: 2000 words / Starter: 10,000 words / Pro: 50,000 words |
| **Clear + Confirm** | Requires confirm if content > 500 words |
| **Sample Document** | "Try a sample" button loads example text |

### Summary Controls
| Feature | Details |
|---|---|
| **Length** | Brief (10% of original) / Standard (20%) / Detailed (35%) |
| **Format** | Bullet Points / Prose Paragraphs / Q&A / Hierarchical Outline |
| **Focus** | Key Facts / Action Items / Conclusions / Arguments / Data Points |
| **Audience** | General / Expert (technical terms preserved) / Simple (plain English, large concepts simplified) |
| **Language** | Output language — placeholder for translator integration |

### Output Tabs
| Tab | Content |
|---|---|
| **Summary** | Main summary in selected format |
| **Key Points** | Top 5–10 bullet points, most important facts |
| **Takeaways** | 3–5 actionable or memorable conclusions as cards |
| **Q&A** | 5 questions + answers that the document answers |

### Stats Panel
| Feature | Details |
|---|---|
| **Compression Meter** | Animated visual: original size → compressed size |
| **Time Saved** | Calculated at 200 WPM average reading speed |
| **Word Count** | Original: X words → Summary: Y words (Z% reduction) |
| **Sentiment** | Positive / Neutral / Mixed / Critical badge |
| **Topic Tags** | Auto-detected: Finance / Tech / Legal / Medical / Education / General |
| **Complexity Score** | Reading level: Elementary / High School / College / Expert |

---

## 📦 State Management

```typescript
interface SummarizerState {
  // Input
  inputText: string;
  inputWordCount: number;
  inputCharCount: number;
  fileName: string | null;
  fileType: string | null;

  // Controls
  summaryLength: 'brief' | 'standard' | 'detailed';
  summaryFormat: 'bullets' | 'paragraphs' | 'qa' | 'outline';
  focusArea: FocusType;
  audienceLevel: AudienceLevel;
  outputLanguage: string;

  // Output
  summary: string | null;
  keyPoints: string[] | null;
  takeaways: Takeaway[] | null;
  qaItems: QAItem[] | null;
  activeTab: 'summary' | 'keypoints' | 'takeaways' | 'qa';

  // Stats
  compressionRatio: number;
  timeSavedMinutes: number;
  outputWordCount: number;
  sentiment: SentimentType | null;
  topicTags: string[];
  complexityScore: string | null;

  // UI
  isGenerating: boolean;
  historyDrawerOpen: boolean;
  error: string | null;
}

interface Takeaway {
  id: string;
  headline: string;
  detail: string;
  category: string;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
}
```

---

## 🔌 API Integration Layer (Build Last)

```typescript
// /services/summarizerService.ts
// STUB during build — wire to Claude API in final phase

export async function summarizeDocument(
  text: string,
  options: SummaryOptions
): Promise<SummaryOutput> {
  // STUB: Return mock summary data
  // FINAL: POST /api/tools/summarizer → Worker → Claude API
  // Returns: { summary, keyPoints, takeaways, qaItems, stats }
}

export async function parseFile(file: File): Promise<string> {
  // Client-side file reading — no API needed
  // .txt and .md: FileReader API
  // .docx: Use mammoth.js client-side library
}
```

**Worker Route:** `POST /api/tools/summarizer`
**Rate Limit:** Input word count tracked in KV per user/tier
**No storage** of input text — privacy first. Only summary outputs optionally saved to D1.

---

## 🎬 Animations & Interactions

- **Compression meter:** Liquid animation — tall container drains from top to compressed level over 1.5s
- **Time saved counter:** Number counts up with easing when result arrives
- **Output tabs:** Fade transition between tabs, content slides in from bottom
- **Takeaway cards:** Stagger in from below with 100ms delay each
- **Topic tags:** Tags pop in one-by-one with scale animation
- **Summarize button:** Shows "Analyzing..." → "Compressing..." → "Done" state labels during process
- **File drop zone:** Border animates to dashed green on drag-over, pulses when file accepted
- **Sample text load:** Text types in at high speed (typewriter effect, 20ms/char)

---

## 📐 Responsive Behavior
- **Desktop (>1100px):** Input top-left, controls center strip, output bottom-left, stats panel right sidebar
- **Tablet (768–1100px):** Stats panel moves to below output, full-width layout
- **Mobile (<768px):** Stacked: Input → Controls → Output → Stats (all full width, scrollable)

---

## 🚫 Constraints & Rules
- Input text only — no URL scraping, no web fetching
- Accepted file types (client-side): .txt, .md only in Phase 1
- Input stored in memory only — never persisted without explicit save
- No processing of sensitive personal data (warn users)
- Privacy notice: "Your text is processed by AI and not stored"

---

## ✅ Definition of Done
- [ ] Text paste area accepts and counts input correctly
- [ ] File drop zone works for .txt files
- [ ] All 4 format options render distinct mock outputs
- [ ] All 4 output tabs display correct content types
- [ ] Compression meter animates correctly with real word counts
- [ ] Time saved calculates accurately
- [ ] Topic tags display as chips
- [ ] Copy and export actions work
- [ ] History drawer opens and shows mock items
- [ ] Responsive layout correct on all breakpoints
- [ ] API service stubbed and documented
