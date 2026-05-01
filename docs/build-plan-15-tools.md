# Build Plan: 15 New AI Tools

> Created: 2025-01-25
> Status: ⬜ Not started  |  🔄 In progress  |  ✅ Complete

---

## Phase 1: Foundation

- [ ] **⬜** `lib/data/tools.ts` — Add all 15 tool entries (id, name, description, route, tier, hasUpload, badge, iconColor, icon)
- [ ] **⬜** Update Supabase categories via `/admin/tool-categories` or seed SQL

---

## Phase 2: Students (4 tools)

### 1. Citation Generator (`citation-generator`)

| Item | Status |
|---|---|
| `lib/services/prompts/citationPrompt.ts` | ⬜ |
| `lib/services/citationService.ts` | ⬜ |
| `components/tools/CitationGenerator/CitationGenerator.tsx` | ⬜ |
| `app/ai-tools/citation-generator/page.tsx` | ⬜ |
| Register in `app/api/tools/[toolId]/route.ts` | ⬜ |

**Free tier:**
- [ ] Source types: Website, Book, Journal Article, YouTube, News
- [ ] Citation styles: APA, MLA only
- [ ] Manual input (type title/author/URL manually)
- [ ] Copy individual citation
- [ ] Limit: 10 citations/day

**Pro tier:**
- [ ] All source types (PDF, Podcast, Image, Tweet, Lecture, Interview)
- [ ] All styles: APA, MLA, Chicago, Harvard, IEEE, Vancouver
- [ ] Bulk mode: paste multiple URLs → get all citations at once
- [ ] Export: copy all, download as .txt/.csv
- [ ] URL auto-detect (paste URL → auto-fill title, author, date, publisher)
- [ ] In-text citation companion (e.g. "(Author, 2024)" alongside full citation)
- [ ] Annotated bibliography mode (citation + 2-3 sentence summary)
- [ ] Unlimited citations

---

### 2. Essay Outliner (`essay-outliner`)

| Item | Status |
|---|---|
| `lib/services/prompts/essayOutlinerPrompt.ts` | ⬜ |
| `lib/services/essayOutlinerService.ts` | ⬜ |
| `components/tools/EssayOutliner/EssayOutliner.tsx` | ⬜ |
| `app/ai-tools/essay-outliner/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: topic, essay type (argumentative, persuasive, expository, narrative)
- [ ] Output: thesis statement + 3 main points with bullet sub-points
- [ ] Copy outline
- [ ] Limit: 5 outlines/day

**Pro tier:**
- [ ] Input: paste research notes → AI generates outline from your material
- [ ] Multiple structure options (chronological, problem-solution, compare-contrast, cause-effect)
- [ ] Counter-argument section for argumentative essays
- [ ] Evidence gap detection ("Point 2 has no supporting evidence — add a source")
- [ ] Export as Markdown or structured text
- [ ] Unlimited outlines

---

### 3. Flashcard Generator (`flashcard-generator`)

| Item | Status |
|---|---|
| `lib/services/prompts/flashcardPrompt.ts` | ⬜ |
| `lib/services/flashcardService.ts` | ⬜ |
| `components/tools/FlashcardGenerator/FlashcardGenerator.tsx` | ⬜ |
| `app/ai-tools/flashcard-generator/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: paste study notes or key terms
- [ ] Generate Q&A flashcards (term → definition)
- [ ] Copy as text
- [ ] Limit: 20 flashcards/day, 3 decks

**Pro tier:**
- [ ] Input: upload PDF or paste long text → AI extracts key concepts automatically
- [ ] Multiple formats: Q&A, fill-in-blank, multiple choice
- [ ] Export: Anki-importable .apkg, Quizlet-format CSV, printable PDF
- [ ] Spaced repetition tracker ("Study these 10 cards today based on your last review")
- [ ] Custom card templates (add images, hints, mnemonics)
- [ ] Unlimited flashcards and decks

---

### 4. Note Taker (`note-taker`)

| Item | Status |
|---|---|
| `lib/services/prompts/noteTakerPrompt.ts` | ⬜ |
| `lib/services/noteTakerService.ts` | ⬜ |
| `components/tools/NoteTaker/NoteTaker.tsx` | ⬜ |
| `app/ai-tools/note-taker/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Paste raw lecture/meeting notes → cleaned up with bullet points
- [ ] Key terms highlighted (bolded in output)
- [ ] Copy result
- [ ] Limit: 3 notes/day

**Pro tier:**
- [ ] Summary mode (raw notes → 3-sentence executive summary + bullet details)
- [ ] Study guide mode (notes → organized by topic with key takeaways)
- [ ] Export as Markdown or formatted document
- [ ] Multiple note templates (Cornell method, outline method, concept map text)
- [ ] Unlimited notes

---

## Phase 3: Office Workers (6 tools)

### 5. Meeting Agenda Generator (`meeting-agenda`)

| Item | Status |
|---|---|
| `lib/services/prompts/meetingAgendaPrompt.ts` | ⬜ |
| `lib/services/meetingAgendaService.ts` | ⬜ |
| `components/tools/MeetingAgenda/MeetingAgenda.tsx` | ⬜ |
| `app/ai-tools/meeting-agenda/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: meeting topic, duration, key discussion points
- [ ] Output: structured agenda with time allotments per item
- [ ] Copy agenda
- [ ] Limit: 5 agendas/day

**Pro tier:**
- [ ] Attendee roles (assign "Presenter" / "Decision-maker" / "Contributor" per item)
- [ ] Pre-meeting prep notes per attendee
- [ ] Export as Markdown or calendar-friendly text
- [ ] Unlimited agendas

---

### 6. Meeting Minutes (`meeting-minutes`)

| Item | Status |
|---|---|
| `lib/services/prompts/meetingMinutesPrompt.ts` | ⬜ |
| `lib/services/meetingMinutesService.ts` | ⬜ |
| `components/tools/MeetingMinutes/MeetingMinutes.tsx` | ⬜ |
| `app/ai-tools/meeting-minutes/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Paste raw conversation notes
- [ ] Output: Decisions made + Action items (who does what)
- [ ] Copy minutes
- [ ] Limit: 3 sets/day

**Pro tier:**
- [ ] Action item table (Task | Owner | Due Date | Status)
- [ ] Decision log (what was decided, rationale, who decided)
- [ ] Agenda integration (minutes mapped to agenda items automatically)
- [ ] Export as Markdown or formatted document
- [ ] Unlimited minutes

---

### 7. Email Reply Generator (`email-reply`)

| Item | Status |
|---|---|
| `lib/services/prompts/emailReplyPrompt.ts` | ⬜ |
| `lib/services/emailReplyService.ts` | ⬜ |
| `components/tools/EmailReplyGenerator/EmailReplyGenerator.tsx` | ⬜ |
| `app/ai-tools/email-reply/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Paste email context (the email you received)
- [ ] Choose reply type: Accept, Decline, Request Info, Thank, Follow Up
- [ ] Choose tone: Professional, Friendly, Direct
- [ ] Generate reply text
- [ ] Copy result
- [ ] Limit: 5 replies/day

**Pro tier:**
- [ ] Thread-aware (paste full thread → generates reply that references previous points)
- [ ] Custom instructions ("mention that I'm on vacation until Friday")
- [ ] Multiple drafts (generate 3 variants, pick best)
- [ ] Urgency detection (auto-suggests "Urgent" vs "Casual" based on email language)
- [ ] Smart subject line generator
- [ ] Auto-fill sender name and signature
- [ ] Unlimited replies

---

### 8. Performance Review Writer (`performance-review`)

| Item | Status |
|---|---|
| `lib/services/prompts/performanceReviewPrompt.ts` | ⬜ |
| `lib/services/performanceReviewService.ts` | ⬜ |
| `components/tools/PerformanceReview/PerformanceReview.tsx` | ⬜ |
| `app/ai-tools/performance-review/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: employee name, role, 3-5 bullet points of achievements/areas for growth
- [ ] Choose review type: Annual, Quarterly, Project-based
- [ ] Output: 2-3 paragraph review with strengths + growth areas + overall rating sentence
- [ ] Copy result
- [ ] Limit: 3 reviews/day

**Pro tier:**
- [ ] SMART goal generator (Specific, Measurable, Achievable, Relevant, Time-bound)
- [ ] Peer feedback integration (paste 360 feedback → synthesize into review)
- [ ] Company values alignment (map achievements to company core values)
- [ ] Multiple tone options (Direct & Honest, Encouraging, Balanced)
- [ ] Past review comparison (shows progress from last review)
- [ ] Unlimited reviews

---

### 9. Policy Writer (`policy-writer`)

| Item | Status |
|---|---|
| `lib/services/prompts/policyWriterPrompt.ts` | ⬜ |
| `lib/services/policyWriterService.ts` | ⬜ |
| `components/tools/PolicyWriter/PolicyWriter.tsx` | ⬜ |
| `app/ai-tools/policy-writer/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: policy topic, key rules (3-5 bullet points)
- [ ] Output: draft policy with Purpose, Scope, Policy Statement, Compliance sections
- [ ] Copy result
- [ ] Limit: 2 drafts/day

**Pro tier:**
- [ ] Multiple policy templates (HR, IT Security, Code of Conduct, Data Privacy, Social Media, Travel, Overtime)
- [ ] Add effective date, version number, approval authority
- [ ] Legal disclaimer footer ("This is a draft template and does not constitute legal advice")
- [ ] Export as Markdown
- [ ] Unlimited drafts

---

### 10. Data Cleanup Tool (`data-cleanup`)

| Item | Status |
|---|---|
| `lib/services/prompts/dataCleanupPrompt.ts` | ⬜ |
| `lib/services/dataCleanupService.ts` | ⬜ |
| `components/tools/DataCleanup/DataCleanup.tsx` | ⬜ |
| `app/ai-tools/data-cleanup/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Paste messy text data (names, emails, addresses)
- [ ] Preset cleanup types: Deduplicate, Standardize format, Extract emails/phones
- [ ] Output: cleaned list
- [ ] Copy result
- [ ] Limit: 5 cleanups/day

**Pro tier:**
- [ ] CSV/TSV input support (paste tabular data)
- [ ] Custom rules ("merge first & last name columns", "format phone numbers as +1 (555) 123-4567")
- [ ] Regex-based pattern extraction (extract all invoice numbers, dates, etc.)
- [ ] Data validation report ("50 rows processed, 3 missing emails flagged")
- [ ] Export as CSV
- [ ] Unlimited cleanups

---

## Phase 4: General / Everyday (5 tools)

### 11. Budget Planner (`budget-planner`)

| Item | Status |
|---|---|
| `lib/services/prompts/budgetPlannerPrompt.ts` | ⬜ |
| `lib/services/budgetPlannerService.ts` | ⬜ |
| `components/tools/BudgetPlanner/BudgetPlanner.tsx` | ⬜ |
| `app/ai-tools/budget-planner/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: monthly income, fixed expenses, variable expenses
- [ ] Predefined categories (Housing, Food, Transport, Utilities, Entertainment, Savings, Other)
- [ ] Output: income vs expenses breakdown + remaining balance
- [ ] Copy summary
- [ ] Limit: 2 budgets

**Pro tier:**
- [ ] Custom categories (add your own labels)
- [ ] Savings goal tracker ("I want to save $5,000 by Dec" → monthly savings target + progress bar)
- [ ] Spending insights ("You're spending 40% on dining out!")
- [ ] "What if" scenarios ("What if I reduce dining out by 20%?" → recalculates savings)
- [ ] Debt payoff calculator (debt amount + APR + monthly payment → payoff date + interest saved)
- [ ] Export as CSV or formatted report
- [ ] Unlimited budgets

---

### 12. Meal Planner (`meal-planner`)

| Item | Status |
|---|---|
| `lib/services/prompts/mealPlannerPrompt.ts` | ⬜ |
| `lib/services/mealPlannerService.ts` | ⬜ |
| `components/tools/MealPlanner/MealPlanner.tsx` | ⬜ |
| `app/ai-tools/meal-planner/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: dietary preference, meals per day, budget level
- [ ] Output: 7-day meal plan (breakfast, lunch, dinner) + grocery list
- [ ] Copy or print
- [ ] Limit: 2 plans/week

**Pro tier:**
- [ ] Allergies/intolerances (gluten-free, dairy-free, nut-free, etc.)
- [ ] Cuisine preference (Italian, Asian, Mexican, etc.)
- [ ] Calorie target per day
- [ ] Leftover optimization ("use Monday's dinner leftovers for Tuesday's lunch")
- [ ] Export grocery list as checklist with category grouping (Produce, Dairy, Meat, Pantry)
- [ ] Nutrition summary per meal (calories, protein, carbs, fat)
- [ ] Unlimited plans

---

### 13. Cover Letter Writer (`cover-letter`)

| Item | Status |
|---|---|
| `lib/services/prompts/coverLetterPrompt.ts` | ⬜ |
| `lib/services/coverLetterService.ts` | ⬜ |
| `components/tools/CoverLetterWriter/CoverLetterWriter.tsx` | ⬜ |
| `app/ai-tools/cover-letter/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: job title, company name, your skills/experience (bullet points)
- [ ] Choose tone: Professional, Enthusiastic, Concise
- [ ] Generate cover letter
- [ ] Copy result
- [ ] Limit: 5 cover letters/day

**Pro tier:**
- [ ] Input: paste full job description → AI matches your skills to JD points
- [ ] Integrate with Resume Builder (import experience automatically)
- [ ] Custom opening paragraph (choose which achievement to lead with)
- [ ] Company research mode ("Tell me what the company does" → AI generates relevant sentence)
- [ ] Multiple drafts (generate 3 variants)
- [ ] Unlimited cover letters

---

### 14. Speech Writer (`speech-writer`)

| Item | Status |
|---|---|
| `lib/services/prompts/speechWriterPrompt.ts` | ⬜ |
| `lib/services/speechWriterService.ts` | ⬜ |
| `components/tools/SpeechWriter/SpeechWriter.tsx` | ⬜ |
| `app/ai-tools/speech-writer/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: occasion, key points
- [ ] Choose tone: Inspiring, Humorous, Formal, Heartfelt
- [ ] Output: 3-5 minute speech with opening, body, closing
- [ ] Copy result
- [ ] Limit: 3 speeches/day

**Pro tier:**
- [ ] Time-based generation (2-min, 5-min, 10-min, 15-min)
- [ ] Audience type (executives, colleagues, students, general public)
- [ ] Quote suggestions (adds relevant quotes based on topic)
- [ ] Emotional arc builder (light start → emotional peak → strong end)
- [ ] Speaker notes ("[pause]", "[make eye contact]", "[gesture here]")
- [ ] Icebreaker hook suggestions
- [ ] Unlimited speeches

---

### 15. Petition Writer (`petition-writer`)

| Item | Status |
|---|---|
| `lib/services/prompts/petitionWriterPrompt.ts` | ⬜ |
| `lib/services/petitionWriterService.ts` | ⬜ |
| `components/tools/PetitionWriter/PetitionWriter.tsx` | ⬜ |
| `app/ai-tools/petition-writer/page.tsx` | ⬜ |
| Register in route.ts | ⬜ |

**Free tier:**
- [ ] Input: cause description, target (who needs to act), why it matters
- [ ] Output: petition title + body with call to action
- [ ] Copy result
- [ ] Limit: 3 petitions/day

**Pro tier:**
- [ ] Signature section formatting (name, email, city — ready to copy to petition platform)
- [ ] Key demand list (bullet points of specific asks)
- [ ] Supporting evidence mode (add data, statistics, or quotes to strengthen petition)
- [ ] Multiple tone options (Urgent, Diplomatic, Emotional, Logical)
- [ ] Export as formatted document
- [ ] Unlimited petitions

---

## Phase 5: Integration

- [ ] **⬜** Register all 15 prompt builders in `app/api/tools/[toolId]/route.ts`
- [ ] **⬜** Add all 15 entries to `lib/data/tools.ts`
- [ ] **⬜** Update `supabase/seed-tool-categories.sql` with new tools

## Phase 6: Polish

- [ ] **⬜** Test each tool on free tier (usage limits work)
- [ ] **⬜** Test pro tier (upgrade modal triggers correctly)
- [ ] **⬜** Verify categories render on `/ai-tools`
- [ ] **⬜** Mobile responsive check

---

## File Pattern (per tool)

```
1. lib/services/prompts/<tool>Prompt.ts       ← Prompt template for Gemini
2. lib/services/<tool>Service.ts              ← fetch() wrapper
3. components/tools/<Tool>/<Tool>.tsx         ← UI component (form + output)
4. app/ai-tools/<tool-slug>/page.tsx          ← Route page
```

Then register the prompt builder in `app/api/tools/[toolId]/route.ts`.
