/**
 * Xalura Content Generation Protocol v1.0 — prompt blocks for agentic writers.
 * Single source of truth for structure, SEO, and quality expectations.
 */
export const XALURA_CONTENT_PROTOCOL_VERSION = "1.0";

const PUBLISHING_GLOBAL_RULES = `
## Xalura Content Protocol v${XALURA_CONTENT_PROTOCOL_VERSION} — global rules
- **Originality:** Do not thinly rewrite sources. Add context, interpretation, and insight. Avoid generic filler.
- **Authority:** Use natural credibility cues (e.g. trend framing, operational perspective, practical use cases) where they fit; do not fabricate data.
- **Tone:** Clear, direct, expert-to-smart-reader — not robotic or buzzword soup.
- **Structure:** Scannable \`##\` / \`###\` headings, short paragraphs (2–4 lines), bullets where they help.
- **SEO:** Primary keyword in the \`#\` title, within the first ~100 words, and in at least one \`##\` heading. Weave related terms naturally; do not stuff.
- **Internal links:** Add **3–5** internal links to relevant Xalura articles when you have paths/URLs from this handoff or context. If none are provided, add a **Related reading** section with specific anchor phrases and implied topics so an editor can map URLs later.
- **Monetization (when relevant):** Tools, affiliates, or sponsors only where they fit the reader; disclose commercial relationships clearly.
- **Intent (end of article):** One final line: \`Content intent: Informational\` or \`Transactional\` or \`Comparative\` (pick one).
- **Freshness:** Reference the current year or “as of [date context]” where it strengthens trust (no fake dates).
- **Cannibalization:** Hold a **unique angle** for this keyword; do not duplicate another article’s core promise.
`.trim();

const ARTICLE_TEMPLATE = `
## Article template (long-form / SEO)
Use this shape unless the SEO handoff explicitly forbids a section:

1. \`# H1\` — Title in a search-friendly pattern (e.g. *Best [X] for [Y] in 2026*, *How to [fix/solve] …*, or *A vs B* when appropriate).
2. **Intro (hook):** problem → promise → why this piece exists now.
3. **Quick answer** — 2–3 sentences with the direct takeaway (featured-snippet style).
4. **Table of contents** — link list to major \`##\` sections.
5. \`## Overview\` (or *What this is*) — clear definitions and scope.
6. \`## Why it matters\` — real-world relevance.
7. \`## Solutions / options\` — for each main option, use \`### Name\` with description, key features, use cases, **Pros** / **Cons** lists as needed.
8. **Comparison table** (Markdown) when comparing multiple options: | Option | Best for | Key feature | Verdict |
9. \`## Best for\` — segment readers (e.g. beginner, budget, advanced).
10. \`## Final verdict\` — unambiguous recommendation when the topic allows.
11. \`## FAQ\` — 3–5 short Q&As.
12. Run the **pre-publish self-check** mentally and fix gaps before you finish.
`.trim();

const PRE_PUBLISH_QC = `
## Pre-publish self-check (mandatory)
- New insight or angle beyond a generic summary?
- Clear structure and scannable headings?
- Matches the reader’s **search intent** for the primary keyword?
- No pointless repetition?
- Internal links (or editor-ready “Related reading”) in place?
- Natural, human-readable tone?
`.trim();

const COURSE_TEMPLATE = `
## Course / learning template (when content type is *course*)
- Preserve the same **originality, authority, and SEO** rules as articles.
- Map the article-style sections to **modules or lessons** (\`## Module …\` / \`### Lesson …\`) while keeping the **keyword** centered in the title, intro, and first module.
- Keep **Quick answer** and **FAQ**; add a **How to use this course** section if it helps.
`.trim();

/** Appended to SEO → Publishing handoff for article and course types. */
export function buildPublishingHandoffProtocolBlock(
  contentType: "article" | "course" | undefined,
): string {
  const ct = contentType ?? "article";
  if (ct === "course") {
    return [PUBLISHING_GLOBAL_RULES, COURSE_TEMPLATE, PRE_PUBLISH_QC].join("\n\n");
  }
  if (ct === "article") {
    return [PUBLISHING_GLOBAL_RULES, ARTICLE_TEMPLATE, PRE_PUBLISH_QC].join("\n\n");
  }
  return "";
}

const NEWS_GLOBAL = `
## Xalura News Protocol v${XALURA_CONTENT_PROTOCOL_VERSION} — news rules
- Stay **grounded in the sources**; do not invent events, quotes, or outlets.
- Still add **interpretation** and **user impact** — not a bare rehash of a wire story.
- **Do not** turn the piece into marketing, affiliate promo, or internal pipeline chatter.
- Keep a **neutral, newsroom** voice: clear, direct, human.
- **Do not** mention internal roles or pipeline labels in the published text unless from a real quoted source.
`.trim();

const NEWS_TEMPLATE = `
## News structure (Markdown)
- \`# H1\` using: **"[Event]: What It Means for [Audience]"** when it fits; otherwise a strong headline that states the event and signal.
- **TL;DR** — 2–3 bullets: what happened, why it matters, who is affected.
- \`## What happened\` — tight factual summary.
- \`## Why this matters\` — industry or trend context; impact.
- \`## Expert insight\` — forward-looking read *without* fabricating data (frame as analysis, not as unattributed “facts”).
- \`## Practical takeaways\` — what a reader should watch, verify, or do next.
- **Optional** \`## Related tools or solutions\` only when genuinely relevant and not promotional fluff.
- \`## FAQ\` — 2–4 short questions.
`.trim();

/** Injected into the News Writer system prompt. */
export function buildNewsWriterProtocolBlock(): string {
  return [NEWS_GLOBAL, NEWS_TEMPLATE].join("\n\n");
}
