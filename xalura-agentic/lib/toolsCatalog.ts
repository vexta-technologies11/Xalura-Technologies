/**
 * Xalura Tools Catalog — single source of truth for agentic article writers.
 * Every tool listed here can be naturally referenced, hyperlinked, and promoted
 * within agent-written articles. This is fed into Worker, Manager, and Executive prompts.
 *
 * Each entry includes:
 * - `id`: stable slug for URL construction
 * - `name`: display name
 * - `route`: the /ai-tools/ path
 * - `tagline`: short value prop
 * - `category`: grouping for natural mentions
 * - `keywords`: related search terms for natural inclusion
 * - `cta_phrase`: natural call-to-action language
 */

export type ToolEntry = {
  id: string;
  name: string;
  route: string;
  tagline: string;
  category: ToolCategory;
  keywords: string[];
  cta_phrase: string;
};

export type ToolCategory =
  | "writing"
  | "content-creation"
  | "productivity"
  | "document-intelligence"
  | "communication"
  | "career"
  | "presentations"
  | "planning";

export const TOOLS_CATALOG: ToolEntry[] = [
  {
    id: "letter",
    name: "Letter Writer",
    route: "/ai-tools/letter",
    tagline: "Write any letter for any occasion — complaint, request, appeal, thank you, and more",
    category: "writing",
    keywords: ["letter writing", "formal letter", "business letter", "complaint letter", "professional letter"],
    cta_phrase: "Try Xalura's free Letter Writer to draft yours in seconds",
  },
  {
    id: "summarizer",
    name: "Document Summarizer",
    route: "/ai-tools/summarizer",
    tagline: "Compress any document into key insights, key points, and takeaways",
    category: "document-intelligence",
    keywords: ["document summarizer", "text summarizer", "AI summary", "summarize document", "key points extractor"],
    cta_phrase: "Summarize lengthy documents instantly with Xalura's free Document Summarizer",
  },
  {
    id: "captions",
    name: "Caption Generator",
    route: "/ai-tools/captions",
    tagline: "Platform-optimized captions for Instagram, TikTok, LinkedIn, and more",
    category: "content-creation",
    keywords: ["caption generator", "social media captions", "Instagram captions", "LinkedIn captions", "TikTok captions"],
    cta_phrase: "Generate platform-optimized captions in seconds with Xalura's free Caption Generator",
  },
  {
    id: "translator",
    name: "AI Translator",
    route: "/ai-tools/translator",
    tagline: "Translate text across 130+ languages while preserving tone and context",
    category: "communication",
    keywords: ["AI translator", "language translation", "translate text", "online translator", "document translator"],
    cta_phrase: "Translate your content across 130+ languages with Xalura's AI Translator",
  },
  {
    id: "invoice",
    name: "Invoice Generator",
    route: "/ai-tools/invoice",
    tagline: "Professional invoices and business letters with auto-calculations",
    category: "productivity",
    keywords: ["invoice generator", "invoice template", "business invoice", "professional invoice", "billing tool"],
    cta_phrase: "Create professional invoices instantly with Xalura's free Invoice Generator",
  },
  {
    id: "study",
    name: "Study Guide + Quiz",
    route: "/ai-tools/study",
    tagline: "Study guides, flashcards with 3D flip, and practice quizzes",
    category: "planning",
    keywords: ["study guide generator", "flashcard maker", "quiz generator", "study tool", "practice quiz"],
    cta_phrase: "Turn any material into study guides, flashcards, and quizzes with Xalura's free Study Guide tool",
  },
  {
    id: "presentation",
    name: "Presentation Builder",
    route: "/ai-tools/presentation",
    tagline: "Full slide decks from any topic with 7 layout types",
    category: "presentations",
    keywords: ["presentation builder", "slide deck maker", "AI presentation", "presentation generator", "slide maker"],
    cta_phrase: "Build complete slide decks from any topic with Xalura's Presentation Builder",
  },
  {
    id: "resume",
    name: "Resume Builder",
    route: "/ai-tools/resume",
    tagline: "ATS-optimized resumes with live scoring and cover letters",
    category: "career",
    keywords: ["resume builder", "ATS resume", "CV maker", "cover letter generator", "resume optimizer"],
    cta_phrase: "Build an ATS-optimized resume with live scoring using Xalura's Resume Builder",
  },
  {
    id: "email",
    name: "Email Generator",
    route: "/ai-tools/email",
    tagline: "Subject line ideas and a ready-to-send draft from a quick description",
    category: "communication",
    keywords: ["email generator", "email writer", "business email", "professional email", "email template"],
    cta_phrase: "Write professional emails fast with Xalura's free Email Generator",
  },
  {
    id: "content",
    name: "Content Generator",
    route: "/ai-tools/content",
    tagline: "Structured, web-friendly copy you can edit and ship",
    category: "content-creation",
    keywords: ["content generator", "AI content writer", "blog post generator", "web copy", "SEO content"],
    cta_phrase: "Generate SEO-friendly web copy in seconds with Xalura's Content Generator",
  },
  {
    id: "report",
    name: "Report Builder",
    route: "/ai-tools/report",
    tagline: "Notes in, structured document out — print-ready layouts",
    category: "document-intelligence",
    keywords: ["report builder", "document generator", "report template", "business report", "structured document"],
    cta_phrase: "Turn rough notes into polished reports with Xalura's Report Builder",
  },
  {
    id: "citation-generator",
    name: "Citation Generator",
    route: "/ai-tools/citation-generator",
    tagline: "Generate citations in APA, MLA, Chicago, Harvard, and more from any source type",
    category: "writing",
    keywords: ["citation generator", "APA citation", "MLA citation", "bibliography generator", "reference generator"],
    cta_phrase: "Generate perfect citations in APA, MLA, Chicago, and more with Xalura's free Citation Generator",
  },
  {
    id: "essay-outliner",
    name: "Essay Outliner",
    route: "/ai-tools/essay-outliner",
    tagline: "Turn any topic into a structured essay outline with thesis, body points, and conclusion",
    category: "writing",
    keywords: ["essay outliner", "essay structure", "outline generator", "essay planning", "writing outline"],
    cta_phrase: "Structure your next essay with Xalura's free Essay Outliner",
  },
  {
    id: "flashcard-generator",
    name: "Flashcard Generator",
    route: "/ai-tools/flashcard-generator",
    tagline: "Turn study notes into Q&A, fill-in-blank, or multiple choice flashcards",
    category: "planning",
    keywords: ["flashcard generator", "study cards", "digital flashcards", "flashcard maker", "study aid"],
    cta_phrase: "Create interactive flashcards from your notes with Xalura's free Flashcard Generator",
  },
  {
    id: "note-taker",
    name: "Note Taker",
    route: "/ai-tools/note-taker",
    tagline: "Clean up messy lecture or meeting notes with bolded key terms and topic organization",
    category: "productivity",
    keywords: ["note taker", "note cleanup", "meeting notes", "lecture notes", "note organizer"],
    cta_phrase: "Organize messy notes into clean summaries with Xalura's free Note Taker",
  },
  {
    id: "meeting-agenda",
    name: "Meeting Agenda Generator",
    route: "/ai-tools/meeting-agenda",
    tagline: "Create structured agendas with timed items, discussion points, and attendee roles",
    category: "productivity",
    keywords: ["meeting agenda", "agenda generator", "meeting planner", "agenda template", "team meeting"],
    cta_phrase: "Create structured meeting agendas in seconds with Xalura's free Meeting Agenda Generator",
  },
  {
    id: "meeting-minutes",
    name: "Meeting Minutes",
    route: "/ai-tools/meeting-minutes",
    tagline: "Convert raw meeting notes into structured minutes with decisions and action items",
    category: "productivity",
    keywords: ["meeting minutes", "meeting notes", "action items", "meeting summary", "team documentation"],
    cta_phrase: "Turn raw meeting notes into structured minutes with Xalura's free Meeting Minutes tool",
  },
  {
    id: "email-reply",
    name: "Email Reply Generator",
    route: "/ai-tools/email-reply",
    tagline: "Generate professional email replies for any situation — accept, decline, follow up, and more",
    category: "communication",
    keywords: ["email reply", "reply generator", "email response", "professional reply", "business correspondence"],
    cta_phrase: "Craft the perfect email reply for any situation with Xalura's free Email Reply Generator",
  },
  {
    id: "performance-review",
    name: "Performance Review Writer",
    route: "/ai-tools/performance-review",
    tagline: "Write professional performance reviews with strengths, growth areas, and SMART goals",
    category: "writing",
    keywords: ["performance review", "employee review", "performance appraisal", "review writer", "HR tool"],
    cta_phrase: "Write professional performance reviews faster with Xalura's free Performance Review Writer",
  },
  {
    id: "policy-writer",
    name: "Policy Writer",
    route: "/ai-tools/policy-writer",
    tagline: "Draft company policies with structured sections and version control",
    category: "writing",
    keywords: ["policy writer", "company policy", "HR policy", "workplace policy", "policy template"],
    cta_phrase: "Draft clear company policies with Xalura's free Policy Writer",
  },
  {
    id: "data-cleanup",
    name: "Data Cleanup Tool",
    route: "/ai-tools/data-cleanup",
    tagline: "Deduplicate, standardize, extract patterns, or apply custom rules to messy data",
    category: "productivity",
    keywords: ["data cleanup", "data deduplication", "data standardization", "data cleaning tool", "data extractor"],
    cta_phrase: "Clean and standardize your data fast with Xalura's free Data Cleanup Tool",
  },
  {
    id: "budget-planner",
    name: "Budget Planner",
    route: "/ai-tools/budget-planner",
    tagline: "Create a personal budget with income/expense breakdown, savings goals, and debt payoff strategies",
    category: "planning",
    keywords: ["budget planner", "personal budget", "expense tracker", "financial planning", "money management"],
    cta_phrase: "Plan your budget and track savings goals with Xalura's free Budget Planner",
  },
  {
    id: "meal-planner",
    name: "Meal Planner",
    route: "/ai-tools/meal-planner",
    tagline: "Create weekly meal plans with dietary preferences, restrictions, and grocery lists",
    category: "planning",
    keywords: ["meal planner", "meal prep", "weekly meal plan", "dietary planning", "grocery list generator"],
    cta_phrase: "Plan your weekly meals with Xalura's free Meal Planner",
  },
];

/**
 * Build a markdown block that lists relevant Xalura tools for the given keyword/subcategory.
 * This gets injected into the Worker task so articles naturally link to tools.
 */
export function buildToolsContextBlock(
  keyword: string,
  subcategory: string,
): string {
  const kw = keyword.toLowerCase();
  const sub = subcategory.toLowerCase();

  // Score each tool by relevance to the keyword + subcategory
  const scored = TOOLS_CATALOG.map((tool) => {
    let score = 0;
    const allKeywords = [tool.name.toLowerCase(), ...tool.keywords.map((k) => k.toLowerCase())];

    for (const tk of allKeywords) {
      if (kw.includes(tk) || tk.includes(kw)) score += 3;
      if (sub.includes(tk) || tk.includes(sub)) score += 2;
    }

    // Category bonus
    if (tool.category === "writing" && (kw.includes("write") || kw.includes("letter") || kw.includes("email"))) score += 2;
    if (tool.category === "content-creation" && (kw.includes("content") || kw.includes("blog") || kw.includes("social"))) score += 2;
    if (tool.category === "career" && (kw.includes("resume") || kw.includes("job") || kw.includes("career"))) score += 2;
    if (tool.category === "document-intelligence" && (kw.includes("document") || kw.includes("report") || kw.includes("summar"))) score += 2;
    if (tool.category === "presentations" && (kw.includes("presentation") || kw.includes("slide") || kw.includes("deck"))) score += 2;
    if (tool.category === "productivity" && (kw.includes("productivity") || kw.includes("organize") || kw.includes("task"))) score += 2;
    if (tool.category === "planning" && (kw.includes("plan") || kw.includes("study") || kw.includes("budget") || kw.includes("meal"))) score += 2;
    if (tool.category === "communication" && (kw.includes("communicat") || kw.includes("translate") || kw.includes("email"))) score += 2;

    return { tool, score };
  });

  const relevant = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (relevant.length === 0) {
    // Pick 3 from different categories as general recommendations
    const general = TOOLS_CATALOG.filter((t) =>
      ["content-creation", "document-intelligence", "writing"].includes(t.category),
    ).slice(0, 3);
    if (general.length === 0) return "";
    relevant.push(...general.map((t) => ({ tool: t, score: 1 })));
  }

  const lines = [
    "",
    "## Xalura tools to naturally reference in this article",
    "",
    "When relevant to the topic, mention and **link** to these Xalura tools. Use natural anchor text — do not force them. The goal is to show readers how Xalura's free tools solve the problems the article discusses.",
    "",
  ];

  for (const { tool } of relevant) {
    const toolUrl = `https://www.xaluratech.com${tool.route}`;
    lines.push(`- **[${tool.name}](${toolUrl})** — ${tool.tagline}. Use anchor text like "${tool.name.toLowerCase()}" or "${tool.tagline.toLowerCase()}".`);
  }

  lines.push(
    "",
    "**Linking rules:**",
    "- Add at least **2-3** natural links to Xalura tools within the body.",
    "- Use descriptive anchor text (e.g., \"Xalura's free [Tool Name]\" not \"click here\").",
    "- Place links where the reader is actively looking for a solution — in \"how to\" sections, recommendation sections, or tool comparisons.",
    "- Add a **Related Xalura Tools** section at the end with brief descriptions and links.",
    "- Do NOT fabricate features or capabilities the tool doesn't have. The tools listed are real and free.",
  );

  return lines.join("\n");
}

/**
 * Build a markdown block for the **Publishing Worker** that tells it to include tool CTAs.
 */
export function buildToolsCTAInstructionsBlock(): string {
  return `
## 🎯 Tool promotion guidelines

This article should **naturally promote Xalura's free AI tools** when relevant. Here's how:

1. **Identify pain points** the article discusses — then show how a Xalura tool solves it.
2. **Link to specific tools** using descriptive anchor text (never "click here").
3. **Include at least 2-3 internal links** to relevant Xalura tools within the article body.
4. **Add a "Related Xalura Tools" section** near the end with brief, helpful descriptions.
5. **Use a natural CTA** like "Try Xalura's free [Tool Name] to [solve problem]" — not salesy, just helpful.
6. **Don't overdo it** — the article must first serve the reader. Tool mentions should feel additive, not promotional.

**Example of good linking:**
> "If you need to draft a professional response quickly, Xalura's free [Email Reply Generator](https://www.xaluratech.com/ai-tools/email-reply) can help you craft the perfect reply in seconds."

**Example CTA section:**
> ### Related Xalura Tools
> - **[Document Summarizer](https://www.xaluratech.com/ai-tools/summarizer)** — Compress lengthy documents into key insights and takeaways.
> - **[Resume Builder](https://www.xaluratech.com/ai-tools/resume)** — Build ATS-optimized resumes with live scoring.
`.trim();
}
