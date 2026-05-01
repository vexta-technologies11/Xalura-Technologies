# Tool 04 — Resume + Cover Letter Builder
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages + R2 | **Framework:** React + TypeScript

---

## 🎯 Purpose
An ATS-optimized resume and matching cover letter generator. Users input their work history and target job, and the tool produces a polished resume with keyword matching, ATS score, and a tailored cover letter — all exportable as PDF.

---

## 🎨 Design Direction
**Aesthetic:** Confident minimalism — crisp white workspace (#ffffff), deep navy (#0a1628), sharp lime green accent (#a8e63d). Typography: `Cabinet Grotesk` (UI), `Lora` (resume preview text).

**Unforgettable Element:** A live ATS Score Gauge — a circular progress meter (0–100) that animates and updates in real time as the user adds keywords, experience, and skills. Color shifts red → yellow → green as score improves. Gives instant feedback loop.

**Layout:** Step-based wizard (5 steps) with a persistent live resume preview panel on the right that updates as steps are completed.

---

## 🧱 Component Architecture

```
ResumeBuilder/
├── ResumeBuilder.tsx               # Root component with wizard logic
├── components/
│   ├── WizardNav/
│   │   ├── WizardNav.tsx           # Step progress indicator (top)
│   │   ├── StepIndicator.tsx       # Individual step dot/line
│   │   └── WizardControls.tsx      # Back / Next / Generate buttons
│   ├── steps/
│   │   ├── Step1_PersonalInfo.tsx  # Name, contact, LinkedIn, location
│   │   ├── Step2_Experience.tsx    # Work history — add/remove jobs
│   │   ├── Step3_Education.tsx     # Education + certifications
│   │   ├── Step4_Skills.tsx        # Skills input + keyword matcher
│   │   └── Step5_JobTarget.tsx     # Paste job description for matching
│   ├── ResumePreview/
│   │   ├── ResumePreview.tsx       # Live right-panel resume
│   │   ├── ResumeTemplate.tsx      # Rendered resume layout
│   │   ├── TemplateSwitch.tsx      # Switch between 4 resume templates
│   │   ├── ATSScoreGauge.tsx       # Circular score meter
│   │   └── KeywordHighlighter.tsx  # Highlights matched keywords
│   ├── CoverLetter/
│   │   ├── CoverLetterTab.tsx      # Tab to switch to cover letter view
│   │   ├── CoverLetterPreview.tsx  # Rendered cover letter
│   │   ├── CoverLetterTone.tsx     # Tone selector for letter
│   │   └── CoverLetterEditor.tsx   # Inline editor
│   ├── ExperienceBuilder/
│   │   ├── ExperienceCard.tsx      # Individual job card
│   │   ├── BulletBuilder.tsx       # Add/edit achievement bullets
│   │   ├── BulletEnhancer.tsx      # "Enhance with AI" per bullet
│   │   └── DateRangePicker.tsx     # Employment date picker
│   └── ExportPanel/
│       ├── ExportPanel.tsx         # Export actions
│       ├── DownloadResume.tsx      # PDF download
│       ├── DownloadCoverLetter.tsx # Separate cover letter PDF
│       └── CopyText.tsx            # Copy plain text version
└── hooks/
    ├── useResumeBuilder.ts         # Core wizard state + generation
    ├── useATSScorer.ts             # ATS keyword scoring logic
    ├── useExperienceManager.ts     # Add/remove/reorder experience
    └── useCoverLetter.ts           # Cover letter generation state
```

---

## ⚙️ Feature Specifications

### Step 1 — Personal Info
| Field | Details |
|---|---|
| Full Name | Text input |
| Professional Title | Text input (e.g. "Senior Software Engineer") |
| Email | Validated email input |
| Phone | Formatted phone input |
| Location | City, State/Country (no full address) |
| LinkedIn URL | Optional |
| Portfolio/Website | Optional |
| Professional Summary | Textarea — can be AI-generated |

### Step 2 — Work Experience
| Feature | Details |
|---|---|
| **Add Job** | + button adds new experience card |
| **Job Card Fields** | Company, Role, Start Date, End Date, Location, Remote toggle |
| **Achievement Bullets** | Add up to 8 bullets per job |
| **Bullet Enhancer** | "Enhance" button rewrites bullet with action verb + metric focus |
| **Drag Reorder** | Jobs can be reordered by drag |
| **Remove Job** | Delete with confirmation |

### Step 3 — Education & Certs
| Feature | Details |
|---|---|
| **Education Entry** | School, Degree, Field, Year |
| **Certifications** | Name, Issuer, Year, Expiry optional |
| **Add Multiple** | Both sections support multiple entries |

### Step 4 — Skills
| Feature | Details |
|---|---|
| **Skill Tags** | Type and press Enter to add tags |
| **Skill Categories** | Auto-categorizes: Technical / Soft / Language / Tools |
| **Suggested Skills** | Based on target role (from Step 5 if entered first) |
| **Proficiency** | Optional: Beginner / Intermediate / Expert per skill |

### Step 5 — Job Target
| Feature | Details |
|---|---|
| **Job Description Paste** | Large textarea for target job description |
| **Keyword Extraction** | Parses JD and highlights matched/missing keywords |
| **Match Score** | Shows % match between resume and JD |
| **Missing Keywords** | List of important keywords not yet in resume |
| **AI Optimize** | One-click: adjusts summary + bullets to better match JD |

### Resume Preview Features
| Feature | Details |
|---|---|
| **4 Templates** | Classic / Modern / Minimal / Executive |
| **ATS Score Gauge** | Live 0–100 score, animates on change |
| **Keyword Highlights** | Matched JD keywords highlighted in green |
| **Inline Edit** | Click any section to edit directly in preview |
| **Page Overflow Alert** | Warning if content exceeds 1 page |

---

## 📦 State Management

```typescript
interface ResumeState {
  // Wizard
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: number[];

  // Personal
  personal: PersonalInfo;

  // Experience
  experience: JobEntry[];

  // Education
  education: EducationEntry[];
  certifications: CertEntry[];

  // Skills
  skills: SkillEntry[];

  // Job Target
  jobDescription: string;
  extractedKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  matchScore: number;

  // Output
  generatedResume: ResumeOutput | null;
  generatedCoverLetter: string | null;
  atsScore: number;
  selectedTemplate: 'classic' | 'modern' | 'minimal' | 'executive';

  // UI
  activeView: 'resume' | 'cover-letter';
  isGenerating: boolean;
  isOptimizing: boolean;
  error: string | null;
}

interface JobEntry {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | 'present';
  location: string;
  isRemote: boolean;
  bullets: BulletEntry[];
}

interface BulletEntry {
  id: string;
  text: string;
  isEnhancing: boolean;
}
```

---

## 🔌 API Integration Layer (Build Last)

```typescript
// /services/resumeService.ts
// STUB during build — wire to Claude API in final phase

export async function generateResume(state: ResumeState): Promise<ResumeOutput> {
  // STUB: Return mock formatted resume data
  // FINAL: POST /api/tools/resume-builder → Worker → Claude API
}

export async function enhanceBullet(bullet: string, role: string): Promise<string> {
  // STUB: Return mock enhanced bullet
  // FINAL: POST /api/tools/resume-builder/enhance → Worker → Claude API
}

export async function generateCoverLetter(state: ResumeState): Promise<string> {
  // STUB: Return mock cover letter
  // FINAL: POST /api/tools/resume-builder/cover-letter → Worker → Claude API
}

export async function scoreATS(resume: ResumeOutput, jd: string): Promise<ATSResult> {
  // STUB: Return mock score 72
  // FINAL: Calculated client-side with keyword matching algorithm
}
```

**Worker Routes:**
- `POST /api/tools/resume-builder`
- `POST /api/tools/resume-builder/enhance`
- `POST /api/tools/resume-builder/cover-letter`

---

## 🎬 Animations & Interactions

- **Wizard step transition:** Slide left/right between steps with spring animation
- **ATS gauge:** Smooth arc animation on score change, color interpolates red→green
- **Bullet enhancer:** Button spins briefly, then text crossfades to enhanced version
- **Keyword match:** Matched keywords pulse briefly with green highlight on detection
- **Template switch:** Preview crossfades between templates, 300ms
- **Step completion:** Checkmark pops into step indicator with scale bounce
- **Experience card add:** Slides in from bottom, expands with spring physics

---

## 📐 Responsive Behavior
- **Desktop (>1100px):** Wizard left (50%), live preview right (50%)
- **Tablet (768–1100px):** Wizard full width, preview toggled via floating button
- **Mobile (<768px):** Wizard only, preview accessible via "Preview Resume" button → full-screen modal

---

## 🚫 Constraints & Rules
- Max jobs: 10
- Max bullets per job: 8
- Max skills: 40
- Job description input: max 3000 characters
- Resume output: always capped at 2 pages in preview
- ATS scoring is client-side keyword matching only — not a guarantee of ATS systems

---

## ✅ Definition of Done
- [ ] All 5 wizard steps render and validate correctly
- [ ] Experience add/remove/reorder works with drag
- [ ] Bullet enhancer UI works (mock response)
- [ ] ATS score gauge animates correctly
- [ ] Keyword extraction from JD highlights in preview
- [ ] All 4 resume templates render correctly
- [ ] Cover letter tab shows mock generated letter
- [ ] Export buttons functional (mock PDF)
- [ ] Responsive layout correct on all breakpoints
- [ ] API service stubbed and documented
