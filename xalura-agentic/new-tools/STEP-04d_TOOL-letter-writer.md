# Tool 07 — Letter Writer
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages | **Framework:** React + TypeScript

---

## 🎯 Purpose
Generate any personal or formal letter — complaint letters, landlord letters, school absence notes, appeal letters, request letters, thank-you letters, resignation letters, and more. Designed for all ages including seniors and non-native English speakers who need help expressing themselves clearly in writing.

---

## 🎨 Design Direction
**Aesthetic:** Refined stationery — cream linen texture (#f5f1ea), deep burgundy (#6b1f2a), aged gold (#c4a35a). Typography: `Playfair Display SC` (headings in small caps), `Sorts Mill Goudy` (body and letter preview). Feels like premium writing paper.

**Unforgettable Element:** The live letter preview renders as a realistic letter on a textured paper background — complete with a letterhead area, date positioning, salutation, body, and closing signature line. It looks like something you'd actually print and send.

**Layout:** Left = simple guided form (who, what, why, tone). Right = live letter preview rendered as physical letter on paper with print-ready formatting.

---

## 🧱 Component Architecture

```
LetterWriter/
├── LetterWriter.tsx                 # Root component
├── components/
│   ├── CategorySelector/
│   │   ├── CategorySelector.tsx     # Large icon-based category picker
│   │   ├── CategoryCard.tsx         # Individual category card
│   │   └── categories.ts            # All letter types + metadata
│   ├── LetterForm/
│   │   ├── LetterForm.tsx           # Left panel — guided form
│   │   ├── SenderInfo.tsx           # Your name, address (optional)
│   │   ├── RecipientInfo.tsx        # Recipient name, company, title
│   │   ├── LetterDate.tsx           # Date picker
│   │   ├── SubjectLine.tsx          # Re: / Subject field
│   │   ├── KeyPoints.tsx            # What to communicate (bullet input)
│   │   ├── ToneSelector.tsx         # Polite / Firm / Formal / Friendly / Urgent
│   │   ├── LengthSelector.tsx       # Brief / Standard / Detailed
│   │   └── GenerateButton.tsx       # CTA
│   ├── LetterPreview/
│   │   ├── LetterPreview.tsx        # Right panel — paper letter
│   │   ├── PaperBackground.tsx      # Textured paper + shadow
│   │   ├── LetterHeader.tsx         # Sender address + date
│   │   ├── RecipientBlock.tsx       # To: address block
│   │   ├── SalutationLine.tsx       # "Dear Mr. Smith,"
│   │   ├── LetterBody.tsx           # Main body paragraphs
│   │   ├── ClosingBlock.tsx         # "Sincerely," + signature line
│   │   └── LetterActions.tsx        # Copy / Print / Export PDF
│   ├── ToneGuide/
│   │   ├── ToneGuide.tsx            # Tooltip helper showing tone examples
│   │   └── ToneExample.tsx          # Before/after tone comparison
│   └── TemplateLibrary/
│       ├── TemplateLibrary.tsx      # Browse saved/starter templates
│       ├── TemplateItem.tsx         # Template card
│       └── UseTemplateButton.tsx    # Load template into form
└── hooks/
    ├── useLetterWriter.ts           # Core generation + state
    ├── useLetterCategories.ts       # Category data + selection
    └── useLetterExport.ts           # Print + PDF export
```

---

## ⚙️ Feature Specifications

### Letter Categories (Icon Grid)
| Category | Sub-types |
|---|---|
| **Complaint** | To company, To landlord, To neighbor, To school, To government |
| **Request** | Information request, Accommodation request, Extension request, Refund request |
| **Appeal** | Decision appeal, Fine appeal, Insurance appeal, Academic appeal |
| **Personal** | Thank you, Congratulations, Condolences, Apology, Reconnection |
| **Formal Business** | Introduction, Partnership proposal, Service inquiry, Reference request |
| **Residential** | Landlord complaint, Lease termination, Maintenance request, Security deposit |
| **Employment** | Resignation, Reference request, Job inquiry, Salary negotiation |
| **School/Education** | Absence note, Grade appeal, Enrollment inquiry, Parent communication |

### Letter Form Fields
| Field | Details |
|---|---|
| **Your Name** | Optional — used in closing and header |
| **Your Address** | Optional — shows in letter header |
| **Recipient Name** | Full name or "To Whom It May Concern" |
| **Recipient Title** | Mr./Ms./Dr./Manager/Director etc. |
| **Company/Organization** | Optional |
| **Date** | Date picker, defaults to today |
| **Subject** | Re: line — auto-suggested based on category |
| **Key Points** | Bullet input — 1 to 5 main points to address |
| **Tone** | Polite / Firm / Formal / Friendly / Urgent — with descriptions |
| **Length** | Brief (1 paragraph) / Standard (2-3 paragraphs) / Detailed (4+ paragraphs) |
| **Language Complexity** | Simple (seniors/ESL) / Standard / Professional |

### Letter Preview Features
| Feature | Details |
|---|---|
| **Paper Rendering** | A4 paper with linen texture, drop shadow, folded top-left corner |
| **Real Formatting** | Proper business letter format — address block, date, salutation, body, closing |
| **Inline Edit** | Click any section to edit directly on the letter |
| **Signature Line** | Printed name + blank line for wet signature |
| **Letterhead Option** | Add personal/business letterhead text at top |
| **Print Layout** | CSS print media query — preview matches printed output exactly |

### Export Options
| Option | Details |
|---|---|
| **Copy Text** | Plain text copy without formatting |
| **Print** | Browser print — letter-formatted, no UI chrome |
| **Export PDF** | Sends to PDF maker tool |
| **Download .txt** | Plain text download |

---

## 📦 State Management

```typescript
interface LetterState {
  // Category
  selectedCategory: LetterCategory | null;
  selectedSubType: string | null;

  // Form
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientTitle: string;
  recipientCompany: string;
  date: string;
  subject: string;
  keyPoints: string[];
  tone: LetterTone;
  length: 'brief' | 'standard' | 'detailed';
  complexity: 'simple' | 'standard' | 'professional';

  // Output
  generatedLetter: LetterOutput | null;
  isEditing: boolean;
  editedContent: string | null;

  // UI
  isGenerating: boolean;
  showToneGuide: boolean;
  templateLibraryOpen: boolean;
  error: string | null;
}

interface LetterOutput {
  salutation: string;
  body: string;        // Full letter body with paragraph breaks
  closing: string;
  printedName: string;
  suggestedSubject: string;
}

type LetterTone = 'polite' | 'firm' | 'formal' | 'friendly' | 'urgent';
```

---

## 🔌 API Integration Layer (Build Last)

```typescript
// /services/letterService.ts
// STUB during build — wire to Claude API in final phase

export async function generateLetter(params: LetterParams): Promise<LetterOutput> {
  // STUB: Return mock letter with placeholder text
  // FINAL: POST /api/tools/letter-writer → Worker → Claude API
  
  const SYSTEM_PROMPT = `You are an expert letter writer who specializes in 
  clear, effective personal and professional correspondence. 
  Write in the requested tone and complexity level.
  Return structured JSON with: salutation, body, closing, printedName`
}
```

**Worker Route:** `POST /api/tools/letter-writer`
**Rate Limit:** Per-user daily count in Cloudflare KV

---

## 🎬 Animations & Interactions

- **Category selection:** Cards scale up on hover, selected card gets burgundy border with gold shimmer
- **Form transitions:** Smooth height animation when new fields appear based on category
- **Paper preview:** Subtle entrance — paper drops in from above with slight bounce, 400ms
- **Letter generation:** Text appears paragraph by paragraph with a fade-in, staggered
- **Tone selector:** Visual gradient bar shifts color to represent urgency/formality level
- **Inline edit:** Paper gets a subtle pencil cursor, active field gets a warm underline
- **Print button:** Brief page-flip animation before system print dialog opens
- **Key point add:** New bullet slides in from left

---

## 📐 Responsive Behavior
- **Desktop (>1000px):** Category selector full width → Form left + Paper preview right
- **Tablet (600–1000px):** Category selector full width → Form stacked above preview
- **Mobile (<600px):** Category → Form wizard → Preview modal (tap "Preview Letter" to see paper view)

---

## 🚫 Constraints & Rules
- No legal letters (cease and desist, demand letters with legal language) — kept to personal/professional use
- No medical appointment refusals or insurance disputes that imply legal advice
- Address fields clearly labeled "optional — only include if you want it in the letter"
- Simple language mode: targets 6th grade reading level output
- All letters include: "Review this draft and personalize before sending"

---

## ✅ Definition of Done
- [ ] All 8 letter categories show correct sub-types
- [ ] Form fields appear/hide correctly per category
- [ ] Key points bullet input works (add/remove)
- [ ] Tone selector shows descriptions
- [ ] Paper preview renders mock letter in business format
- [ ] Inline edit works on preview
- [ ] Print function outputs clean letter (no UI chrome)
- [ ] All tone options produce visually distinct mock outputs
- [ ] Responsive layout correct on all breakpoints
- [ ] API service stubbed and documented
