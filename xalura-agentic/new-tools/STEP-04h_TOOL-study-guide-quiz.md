# Tool 11 — Study Guide + Quiz Maker
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages | **Framework:** React + TypeScript

---

## 🎯 Purpose
Paste any text — lecture notes, textbook chapter, article, or study material — and get back a structured study guide with flashcards, key terms, and a practice quiz. Designed for students, educators, and self-learners.

---

## 🎨 Design Direction
**Aesthetic:** Warm study space — soft cream (#faf8f4), deep teal (#0d5550), warm amber (#e8a838). Typography: `Outfit` (UI), `Source Serif 4` (study content). Feels like a focused desk lamp on a study table.

**Unforgettable Element:** A flashcard flip animation — cards physically flip 3D-style to reveal answers, and students can swipe "Got it" (green) or "Study again" (red) to build a spaced repetition queue.

---

## 🧱 Component Architecture

```
StudyGuide/
├── StudyGuide.tsx                      # Root component
├── components/
│   ├── InputSection/
│   │   ├── InputSection.tsx            # Paste or upload study material
│   │   ├── TextPasteArea.tsx           # Large paste area
│   │   ├── SourceTypeSelector.tsx      # Lecture notes / Textbook / Article / Meeting notes
│   │   ├── ComplexitySelector.tsx      # High school / College / Graduate / Expert
│   │   └── GenerateButton.tsx
│   ├── GuideTabs/
│   │   ├── GuideTabs.tsx               # Tab: Study Guide / Flashcards / Quiz
│   │   ├── StudyGuideTab.tsx
│   │   ├── FlashcardsTab.tsx
│   │   └── QuizTab.tsx
│   ├── StudyGuideView/
│   │   ├── OverviewSection.tsx
│   │   ├── ConceptCard.tsx
│   │   ├── KeyTermsList.tsx
│   │   ├── StudyTipsCard.tsx
│   │   └── SummarySection.tsx
│   ├── FlashcardsView/
│   │   ├── FlashcardDeck.tsx           # Full-screen flip deck
│   │   ├── Flashcard.tsx               # 3D flip card component
│   │   ├── FlashcardProgress.tsx       # Progress bar
│   │   └── SpacedRepetitionQueue.tsx   # "Got it" / "Study again" tracking
│   ├── QuizView/
│   │   ├── QuizView.tsx                # Quiz container
│   │   ├── QuizQuestion.tsx            # Individual question display
│   │   ├── QuizProgress.tsx            # Question progress bar
│   │   ├── QuizResults.tsx             # Score + review
│   │   └── AnswerExplanation.tsx       # Why this answer
│   └── ExportBar/
│       ├── ExportBar.tsx
│       ├── ExportGuide.tsx
│       ├── ExportFlashcards.tsx
│       └── ExportQuiz.tsx
└── hooks/
    ├── useStudyGuide.ts
    ├── useFlashcards.ts
    └── useQuiz.ts
```

---

## ⚙️ Feature Specifications

### Study Guide Output
- Overview paragraph
- Key concepts with explanations
- Key terms with definitions
- Study tips based on topic
- Summary section

### Flashcards
- 3D flip animation (front → back)
- "Got it" / "Study again" buttons
- Progress tracking
- Shuffle mode
- Auto-flip timer option

### Quiz
- Multiple choice, true/false, fill-in-blank question types
- Timer option
- Auto-grading with score
- Answer explanations for review
- Retake option

---

## ✅ Definition of Done
- [ ] Input accepts paste text and generates mock guide
- [ ] All 3 tabs (Study Guide/Flashcards/Quiz) render
- [ ] Flashcard flip animation works
- [ ] "Got it" / "Study again" tracking works
- [ ] Quiz questions display and score correctly
- [ ] Responsive layout correct
- [ ] API service stubbed
