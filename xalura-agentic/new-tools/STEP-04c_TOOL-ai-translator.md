# Tool 06 — AI Translator
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages | **Framework:** React + TypeScript

---

## 🎯 Purpose
Translate text, documents, and conversations between 130+ languages instantly. Designed for immigrants, travelers, international businesses, multilingual families, and global content creators. Goes beyond word-for-word — preserves tone, context, and formality.

---

## 🎨 Design Direction
**Aesthetic:** Global cartographic — deep ocean blue (#0d2137), warm sand (#e8d5b0), coral accent (#ff6b47). Typography: `Syne` (bold UI), `Noto Serif` (body — supports global scripts). Subtle world map dot-grid pattern in background.

**Unforgettable Element:** A "Language Bridge" visual — when translation runs, an animated arc draws between the source language flag and target language flag, like a signal beam traveling across a globe. Fast, satisfying, memorable.

**Layout:** Classic side-by-side translation panel (left = source, right = translated). Top bar = language selectors with swap button. Bottom = document upload zone and tools strip.

---

## 🧱 Component Architecture

```
AITranslator/
├── AITranslator.tsx                 # Root component
├── components/
│   ├── LanguageBar/
│   │   ├── LanguageBar.tsx          # Top language selector bar
│   │   ├── SourceLanguageSelect.tsx # Source language (with auto-detect)
│   │   ├── TargetLanguageSelect.tsx # Target language selector
│   │   ├── SwapLanguagesButton.tsx  # Animated swap button
│   │   ├── LanguageBridge.tsx       # Animated arc between flags
│   │   └── RecentLanguages.tsx      # Quick-access recent pairs
│   ├── TranslationPanels/
│   │   ├── TranslationPanels.tsx    # Side-by-side container
│   │   ├── SourcePanel/
│   │   │   ├── SourcePanel.tsx      # Left panel
│   │   │   ├── SourceTextArea.tsx   # Input textarea
│   │   │   ├── SourceStats.tsx      # Word/char count
│   │   │   ├── DetectedLanguage.tsx # "Detected: Spanish" badge
│   │   │   └── ClearSource.tsx      # Clear button
│   │   └── TargetPanel/
│   │       ├── TargetPanel.tsx      # Right panel
│   │       ├── TranslatedText.tsx   # Output display (not editable)
│   │       ├── AlternativeButton.tsx# Show alternative translations
│   │       ├── TargetStats.tsx      # Output word count
│   │       ├── CopyTarget.tsx       # Copy translated text
│   │       └── TextToSpeech.tsx     # 🔊 Listen button (browser TTS)
│   ├── ToolsStrip/
│   │   ├── ToolsStrip.tsx           # Mode selector strip
│   │   ├── TextModeButton.tsx       # Text translation mode
│   │   ├── DocumentModeButton.tsx   # Document upload mode
│   │   ├── FormalityToggle.tsx      # Formal / Informal toggle
│   │   └── PreserveFormattingToggle.tsx
│   ├── DocumentMode/
│   │   ├── DocumentMode.tsx         # Document translation panel
│   │   ├── DocumentDropZone.tsx     # Drop .txt / .md files
│   │   ├── DocumentTranslateBtn.tsx # Translate full document
│   │   └── DocumentOutput.tsx       # Translated document output
│   ├── PhrasebookPanel/
│   │   ├── PhrasebookPanel.tsx      # Side drawer
│   │   ├── SavedPhrase.tsx          # Individual saved translation
│   │   ├── PhraseCategory.tsx       # Category grouping
│   │   └── ExportPhrasebook.tsx     # Export as PDF/TXT
│   └── LanguageDetector/
│       ├── LanguageDetector.tsx     # Auto-detect UI component
│       └── DetectionBadge.tsx       # Detected language display
└── hooks/
    ├── useTranslator.ts             # Core translation logic + state
    ├── useLanguageDetect.ts         # Client-side language detection hint
    ├── usePhrasebook.ts             # Save/manage translations
    ├── useTextToSpeech.ts           # Browser SpeechSynthesis API
    └── useRecentLanguages.ts        # Recent language pairs
```

---

## ⚙️ Feature Specifications

### Language Selection
| Feature | Details |
|---|---|
| **Source Languages** | 130+ languages with flag icons + native name |
| **Auto-Detect** | Default source option — detects from input text |
| **Target Languages** | Same 130+ list |
| **Swap Button** | Animates swap of source/target + content |
| **Recent Pairs** | Shows last 5 used language pairs as quick chips |
| **Favorites** | Star any language to pin to top of list |
| **Search** | Search languages by name or native name |

### Text Translation Features
| Feature | Details |
|---|---|
| **Character Limit** | Free: 500 chars / Starter: 5000 / Pro: 50,000 |
| **Auto-Translate** | Translates 800ms after user stops typing (debounced) |
| **Manual Translate** | Button for longer texts |
| **Alternative Translations** | Show 2-3 alternative phrasings for selected text |
| **Formality Toggle** | Formal / Informal — affects output register |
| **Preserve Formatting** | Keeps line breaks, paragraphs in output |
| **Text-to-Speech** | Browser native TTS for source and output |
| **Detected Language** | Badge shows auto-detected source language |

### Document Mode Features
| Feature | Details |
|---|---|
| **File Types** | .txt, .md (Phase 1) |
| **Output** | Translated text in same structure |
| **Download** | Download translated .txt file |
| **Preserve Line Breaks** | Maintains document structure |

### Phrasebook Features
| Feature | Details |
|---|---|
| **Save Translation** | Bookmark any translation to phrasebook |
| **Categories** | Auto / Travel / Business / Personal / Custom |
| **Export** | Export phrasebook as .txt or send to PDF tool |
| **Search** | Search saved phrases |

---

## 📦 State Management

```typescript
interface TranslatorState {
  // Language Selection
  sourceLanguage: Language | 'auto';
  targetLanguage: Language;
  detectedLanguage: Language | null;
  recentPairs: LanguagePair[];
  favoriteLanguages: string[];

  // Text Mode
  sourceText: string;
  translatedText: string | null;
  alternatives: string[];
  formality: 'formal' | 'informal';
  preserveFormatting: boolean;
  charCount: number;

  // Document Mode
  documentFile: File | null;
  documentSourceText: string | null;
  documentTranslated: string | null;

  // UI
  mode: 'text' | 'document';
  isTranslating: boolean;
  isSpeakingSource: boolean;
  isSpeakingTarget: boolean;
  phrasebookOpen: boolean;
  showAlternatives: boolean;
  error: string | null;
}

interface Language {
  code: string;          // 'es', 'fr', 'ja'
  name: string;          // 'Spanish'
  nativeName: string;    // 'Español'
  flag: string;          // '🇪🇸'
  rtl: boolean;          // right-to-left script
}

interface LanguagePair {
  source: string;
  target: string;
  lastUsed: Date;
}
```

---

## 🔌 API Integration Layer (Build Last)

```typescript
// /services/translatorService.ts
// STUB during build — wire to Microsoft Translator API in final phase

export async function translateText(
  text: string,
  from: string | 'auto',
  to: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  // STUB: Returns mock translation
  // FINAL: POST /api/tools/translator → Worker → Microsoft Translator API
  // Free tier: 2M chars/month — no cost to start
}

export async function detectLanguage(text: string): Promise<string> {
  // STUB: Returns 'en'
  // FINAL: POST /api/tools/translator/detect → Worker → Microsoft Translator API
}
```

**Worker Route:** `POST /api/tools/translator`
**API:** Microsoft Translator (2M chars/month free)
**Rate Limit:** Character count tracked per user in Cloudflare KV
**RTL Support:** Target panel flips text direction for Arabic, Hebrew, etc.

---

## 🎬 Animations & Interactions

- **Language bridge arc:** SVG arc draws from source flag to target flag in 600ms on translate
- **Swap button:** 180° rotation animation, content swaps mid-rotation
- **Auto-translate indicator:** Pulsing dot appears in target panel while debounce timer runs
- **Output reveal:** Translated text fades in word-by-word (not streaming — CSS animation)
- **Detected language badge:** Slides in from left when auto-detect fires
- **Alternative translations:** Expand below with spring animation
- **Copy success:** Panel flashes briefly, icon swaps to checkmark
- **Phrasebook drawer:** Slides in from right
- **Flag icons:** Subtle hover lift on language selector flags

---

## 📐 Responsive Behavior
- **Desktop (>900px):** True side-by-side panels, language bar full width
- **Tablet (600–900px):** Source panel top, target panel below, language bar full width
- **Mobile (<600px):** Stacked — language selector row, source textarea, translate button, output below. Swap button repositions between panels

---

## 🚫 Constraints & Rules
- RTL languages (Arabic, Hebrew, Persian, Urdu) must render right-to-left in target panel
- No translation of image text in Phase 1
- Text-to-speech uses browser SpeechSynthesis API — language support varies by device
- Phrasebook stored in localStorage (D1 sync in final phase)
- Character limits enforced client-side before API call

---

## ✅ Definition of Done
- [ ] Language selectors render 130 languages with flags
- [ ] Auto-detect badge appears after input (mocked)
- [ ] Swap button animates and swaps content correctly
- [ ] Language bridge arc animates on translate action
- [ ] Source and target panels side-by-side on desktop
- [ ] RTL direction applied to Arabic/Hebrew in target panel
- [ ] Text-to-speech works using browser SpeechSynthesis
- [ ] Phrasebook save/view works with localStorage
- [ ] Document mode file drop accepts .txt
- [ ] Responsive layout correct on all breakpoints
- [ ] API service stubbed and documented
