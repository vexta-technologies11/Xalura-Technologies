# PRO Feature — AI File Upload & Rewrite
**Feature Tag:** `[PRO]` | **Badge:** "REVISED BY AI" | **Tier:** Starter+ (limited) / Pro (full)
**Applies To:** Tools 01, 02, 04, 05, 07, 08, 09, 10, 11

---

## 🎯 Feature Overview

Users upload an existing document (resume, article, email draft, invoice, notes, presentation outline, etc.) and the AI reads it, extracts the content, and **rewrites or enhances it** based on selected parameters — industry, job position, tone, audience, platform, or purpose.

Every AI-rewritten output is stamped with a **"REVISED BY AI" badge** so users always know what the AI touched vs. what they wrote.

---

## 🏷️ The "REVISED BY AI" Badge System

### Badge Variants
```typescript
type RevisionBadge =
  | 'REVISED BY AI'          // Full rewrite
  | 'ENHANCED BY AI'         // Improvement of existing
  | 'OPTIMIZED FOR [TARGET]' // Targeted optimization
  | 'TRANSLATED & REVISED'   // Translation tool variant
```

### Badge Display Rules
- Always appears in top-right corner of output card/preview
- Gold background (#c9a84c), dark text, monospace font
- Tooltip on hover: "This document was processed and rewritten by AI based on your parameters"
- Clicking badge shows a diff panel: original vs revised (side-by-side)
- Badge persists on exported PDFs as a subtle footer watermark

---

## 📁 Accepted File Types Per Tool

| Tool | Accepted Upload Types | What AI Does With It |
|---|---|---|
| **04 Resume Builder** | .pdf, .docx, .txt | Parses resume → rewrites for target role/industry |
| **05 Summarizer** | .txt, .docx, .pdf, .md | Already handles docs — adds "Re-summarize" mode |
| **07 Letter Writer** | .txt, .docx, .pdf | Rewrites existing letter with new tone/recipient |
| **08 Presentation** | .txt, .md, .docx | Converts notes/outline into full slide deck |
| **09 Caption Generator** | .txt, .docx | Rewrites existing captions for new platform/tone |
| **10 Invoice Generator** | .txt, .csv | Parses old invoice data → rebuilds with new branding |
| **11 Study Guide** | .txt, .docx, .pdf, .md | Already handles docs — "Reprocess" with new level |

---

## 🌟 TOOL 04 — Resume Builder (Flagship Implementation)

Step 0 — Upload Gate that offers two paths: Upload Resume (PRO) or Start Fresh (Free).

When uploading, the AI parses the resume, auto-fills all 5 wizard steps, then user targets a position + industry. AI rewrites the entire resume optimized for that role. Output stamped "OPTIMIZED FOR [POSITION]".

---

## 🏗️ Shared Upload Infrastructure

### Client-Side File Parser
```typescript
import * as mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<{
  text: string;
  wordCount: number;
  fileType: string;
  fileName: string;
}> {
  // .txt / .md → FileReader
  // .docx → mammoth.js client-side
  // .pdf → stubbed (Worker in Phase 4)
}
```

### Shared UploadZone Component
```typescript
interface UploadZoneProps {
  acceptedTypes: string[];
  maxSizeMB: number;
  onFileParsed: (result: ParsedFile) => void;
  onError: (error: string) => void;
  proRequired?: boolean;
}

// States: idle → drag-over → uploading → parsing → success → error
```

### File Size Limits Per Tier
```typescript
const FILE_LIMITS = {
  free:    { maxMB: 0,    enabled: false },  // upload disabled
  starter: { maxMB: 5,    enabled: true  },
  pro:     { maxMB: 25,   enabled: true  },
  agency:  { maxMB: 50,   enabled: true  },
}
```

---

## 🎬 Upload Mode UX Animations

- **Drop zone activate:** Border draws itself around the zone clockwise, 400ms
- **File reading:** Horizontal scan line moves down the zone like a scanner, 800ms
- **Parse success:** Zone morphs into a compact "file chip", smooth height collapse
- **Diff viewer open:** Slides up from bottom, content crossfades in 300ms
- **Diff highlight:** Changed text highlights pulse briefly (green adds, red removes)

---

## ✅ Definition of Done (Upload Feature)

- [ ] UploadZone component renders in all 9 applicable tools
- [ ] Free tier shows locked state with PRO badge correctly
- [ ] Drag-and-drop works for .txt, .docx, .pdf on Starter+
- [ ] Client-side .txt and .md parsing works without API
- [ ] .docx parsing via mammoth.js works client-side
- [ ] .pdf parsing stubbed (Worker integration in Phase 4)
- [ ] Parsed content auto-fills tool form fields correctly
- [ ] ResumeBuilder Step 0 upload gate renders both options
- [ ] Target position + industry fields appear in upload mode
- [ ] REVISED BY AI badge appears on all upload-mode outputs
- [ ] Diff viewer shows original vs revised side-by-side
- [ ] Accept All / Revert All functions work in diff viewer
- [ ] File size limits enforced per tier
- [ ] Error states handled (wrong type, too large, parse fail)
