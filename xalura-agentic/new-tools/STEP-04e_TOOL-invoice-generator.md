# Tool 10 — Invoice + Business Letter Generator
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages + R2 | **Framework:** React + TypeScript

---

## 🎯 Purpose
Generate professional invoices and business letters for freelancers, contractors, small business owners, and tradespeople. Clean, branded outputs that look professional without needing a designer or accountant. Auto-calculates totals, taxes, and generates matching business correspondence.

---

## 🎨 Design Direction
**Aesthetic:** Modern finance-forward — slate navy (#1e293b), clean white (#f8fafc), vivid emerald (#10b981), warm amber (#f59e0b) for financial callouts. Typography: `Outfit` (UI labels), `Crimson Pro` (invoice preview text). Feels trusted, established, professional.

**Unforgettable Element:** A "Running Total" ticker — as users add line items, the invoice total updates with an animated number counter (like a cash register display). Tax and subtotal lines animate separately. Feels satisfying to watch the invoice build itself.

**Layout:** Left = invoice builder form (tabs: Invoice / Business Letter). Right = live invoice preview that looks like a real A4 document with brand colors applied.

---

## 🧱 Component Architecture

```
InvoiceGenerator/
├── InvoiceGenerator.tsx               # Root component
├── components/
│   ├── ModeSelector/
│   │   ├── ModeSelector.tsx           # Tab: Invoice / Business Letter
│   │   └── ModeTab.tsx                # Individual mode tab
│   ├── InvoiceMode/
│   │   ├── InvoiceBuilder/
│   │   │   ├── InvoiceBuilder.tsx     # Left panel — invoice form
│   │   │   ├── BusinessInfo.tsx       # Your business details
│   │   │   ├── ClientInfo.tsx         # Client details
│   │   │   ├── InvoiceMeta.tsx        # Invoice #, date, due date
│   │   │   ├── LineItemsTable.tsx     # Dynamic line items with totals
│   │   │   ├── LineItem.tsx           # Individual item row
│   │   │   ├── TaxSettings.tsx        # Tax rate + type selector
│   │   │   ├── DiscountField.tsx      # Optional discount %/fixed
│   │   │   ├── NotesField.tsx         # Payment terms + notes
│   │   │   └── PaymentDetails.tsx     # Bank/payment info section
│   │   └── InvoicePreview/
│   │       ├── InvoicePreview.tsx     # Right panel — live A4 preview
│   │       ├── InvoiceHeader.tsx      # Logo + business info
│   │       ├── InvoiceMetaBlock.tsx   # Invoice # / dates
│   │       ├── BilledToBlock.tsx      # Client info block
│   │       ├── LineItemsPreview.tsx   # Formatted items table
│   │       ├── TotalsBlock.tsx        # Subtotal / tax / discount / total
│   │       ├── RunningTotalTicker.tsx # Animated total display
│   │       ├── NotesPreview.tsx       # Notes + payment info
│   │       └── InvoiceFooter.tsx      # Footer with brand
│   ├── LetterMode/
│   │   ├── BusinessLetterBuilder.tsx  # Business letter form
│   │   ├── LetterTypeSelector.tsx     # Type: Quote / Proposal / Follow-up / Thank you / Intro
│   │   ├── LetterFormFields.tsx       # Standard letter fields
│   │   └── LetterPreview.tsx         # Business letter paper preview
│   ├── BrandingSetup/
│   │   ├── BrandingSetup.tsx          # One-time branding config
│   │   ├── LogoUploader.tsx           # Upload business logo
│   │   ├── ColorThemePicker.tsx       # Brand primary color
│   │   ├── BusinessSave.tsx           # Save business profile
│   │   └── SavedProfiles.tsx          # Manage saved business profiles
│   └── ExportBar/
│       ├── ExportBar.tsx              # Bottom export actions
│       ├── SendToPDF.tsx              # Generate + download PDF
│       ├── ShareLink.tsx              # R2 shareable link
│       ├── SaveDraft.tsx              # Save draft to D1
│       ├── DuplicateDoc.tsx           # Clone document
│       └── DocumentHistory.tsx        # Past invoices/letters list
└── hooks/
    ├── useInvoiceBuilder.ts           # Invoice state + calculations
    ├── useBusinessLetter.ts           # Letter generation state
    ├── useLineItems.ts                # Add/remove/calculate line items
    ├── useBrandingProfile.ts          # Saved business profiles
    └── useRunningTotal.ts             # Animated total calculations
```

---

## ⚙️ Feature Specifications

### Invoice Builder Fields
| Section | Fields |
|---|---|
| **Your Business** | Business Name, Address, Phone, Email, Website, Logo |
| **Bill To** | Client Name, Company, Address, Email |
| **Invoice Meta** | Invoice Number (auto-increment), Issue Date, Due Date, Currency |
| **Line Items** | Description, Quantity, Unit Price, Line Total (auto) |
| **Tax** | Tax Rate %, Tax Label (GST/VAT/Sales Tax), Tax applied on subtotal |
| **Discount** | % or fixed amount, applied before or after tax |
| **Notes** | Payment terms, bank details, special instructions |
| **Payment Info** | Bank Name, Account, Routing, PayPal, Zelle, Venmo |

### Line Items Table Features
| Feature | Details |
|---|---|
| **Add Item** | + button adds new row |
| **Remove Item** | × button per row with confirmation |
| **Drag Reorder** | Reorder line items by drag |
| **Auto-Calculate** | Qty × Unit Price = Line Total, updates instantly |
| **Subtotal** | Auto-calculated from all line totals |
| **Tax Calc** | Tax Rate × Subtotal = Tax Amount |
| **Discount Calc** | Applied before or after tax based on setting |
| **Grand Total** | Animated ticker display |
| **Currency** | USD / EUR / GBP / CAD / AUD / MXN + custom |

### Business Letter Types
| Type | Use Case |
|---|---|
| **Quote/Estimate** | Price proposal before project start |
| **Project Proposal** | Scope + timeline + investment |
| **Follow-Up** | After meeting, proposal, or invoice |
| **Thank You** | Post-project, post-payment |
| **Introduction** | New business introduction |
| **Collection Notice** | Overdue payment reminder (polite) |

### Branding Features
| Feature | Details |
|---|---|
| **Logo Upload** | PNG/JPG/SVG, auto-sized |
| **Brand Color** | Applied to headers, table headers, total block |
| **Save Profile** | Save business info as profile — loads on next visit |
| **Multiple Profiles** | Switch between client businesses (Agency plan) |

---

## 📦 State Management

```typescript
interface InvoiceState {
  // Mode
  mode: 'invoice' | 'letter';

  // Business Info
  businessProfile: BusinessProfile | null;
  savedProfiles: BusinessProfile[];

  // Invoice Fields
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;

  // Client
  client: ClientInfo;

  // Line Items
  lineItems: LineItem[];
  subtotal: number;       // computed
  taxRate: number;
  taxLabel: string;
  taxAmount: number;      // computed
  discount: DiscountConfig;
  discountAmount: number; // computed
  grandTotal: number;     // computed

  // Notes
  paymentNotes: string;
  paymentDetails: string;

  // Letter Mode
  letterType: BusinessLetterType;
  letterFields: Record<string, string>;
  generatedLetter: string | null;

  // UI
  isGeneratingLetter: boolean;
  brandingSetupOpen: boolean;
  documentHistoryOpen: boolean;
  shareLink: string | null;
  error: string | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;         // computed: qty × unitPrice
}

interface BusinessProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string | null;
  brandColor: string;
  taxLabel: string;
  defaultTaxRate: number;
  paymentDetails: string;
}
```

---

## 🔌 API Integration Layer (Build Last)

```typescript
// /services/invoiceService.ts
// Invoice calculations are 100% client-side — no API needed

// /services/businessLetterService.ts
// STUB during build — wire to Claude API in final phase

export async function generateBusinessLetter(
  type: BusinessLetterType,
  context: LetterContext
): Promise<string> {
  // STUB: Return mock business letter
  // FINAL: POST /api/tools/invoice-generator/letter → Worker → Claude API
}

// PDF generation:
// FINAL: POST /api/tools/invoice-generator/pdf → Worker → APITemplate.io
//        Sends invoice JSON → returns PDF → stores in R2 → returns signed URL
```

**Worker Routes:**
- `POST /api/tools/invoice-generator/pdf`
- `POST /api/tools/invoice-generator/letter`
- `GET /api/tools/invoice-generator/history`

**Note:** All invoice math is client-side. Only PDF generation needs a Worker.

---

## 🎬 Animations & Interactions

- **Running total ticker:** Number counts up/down with spring easing on every line item change — like a digital cash register
- **Line item add:** Row slides in from bottom, quantity field auto-focuses
- **Line item remove:** Row collapses with smooth height animation, totals update
- **Tax toggle:** Tax row appears/disappears with slide animation, total re-tickers
- **Logo upload:** Drop zone morphs into logo display with fade transition
- **Brand color apply:** Invoice preview crossfades to new brand color in 300ms
- **PDF generating:** Preview gets a subtle shimmer overlay, progress indicator
- **Share link generate:** Link appears with a pulse animation, clipboard copies on click
- **Invoice number auto-increment:** Number increments with a satisfying slot-machine roll

---

## 📐 Responsive Behavior
- **Desktop (>1100px):** Builder left (45%), preview right (55%)
- **Tablet (600–1100px):** Builder full width, preview below (scaled A4 paper)
- **Mobile (<600px):** Builder only with floating "Preview" button → modal overlay preview

---

## 🚫 Constraints & Rules
- Invoice calculations are purely mathematical — not tax advice
- Max line items: 25
- Logo max file size: 2MB
- Saved business profiles stored in localStorage (D1 in final phase)
- Collection Notice letter includes: "This is a reminder — not a legal notice"
- No integration with payment gateways in Phase 1

---

## ✅ Definition of Done
- [ ] All invoice form fields work and validate
- [ ] Line item add/remove/reorder works
- [ ] All calculations correct (subtotal, tax, discount, total)
- [ ] Running total ticker animates on every change
- [ ] Live A4 preview updates in real time
- [ ] Logo upload shows in preview
- [ ] Brand color applies to preview headers
- [ ] Business letter mode shows form + generates mock letter
- [ ] All 5 letter types show different form fields
- [ ] Export bar buttons work (mock PDF)
- [ ] Business profile save/load works with localStorage
- [ ] Responsive layout correct on all breakpoints
- [ ] API service stubbed and documented
