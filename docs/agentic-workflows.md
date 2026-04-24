# Xalura agentic content system — consultant briefing

This document explains **what the system actually produces**, **how work moves from idea to live page**, and **what every named role does**, in order, as if you were onboarding a technical consultant. It is written to match the current product behavior, not to mirror source file names.

---

## 1. What “published” means in this system

When automation finishes its happy path, the business gets:

- **A public article** on the company website: a **URL** like `/articles/your-article-slug` backed by a **database row** (title, markdown **body**, optional **hero image** URL, excerpt, author, publish timestamp). Visitors read the rendered markdown; the list page and detail page pull from the same store.
- **A recorded handoff** so downstream steps know “an article just shipped”: a durable **event** (conceptually: *keyword work was packaged*, then *an article was published*) so the **Marketing** side can be wired to only run when there is something real to promote.
- **Optional follow-through:** posting a link to an **external network** (e.g. team feed), emailing **operational digests** about the run, and—if turned on—an **HTML email to the founder** with compliance-style analysis and an optional **hero image** attached.

Nothing in the “advisory” path **unpublishes** or **rejects** a live page. The **only** hard gates before something becomes the long-form **Publishing** output are the **Publishing Manager** (and upstream **SEO** approval when the pipeline is chained the strict way).

---

## 2. The big picture: two kinds of work

**Production ladder (the main line)**  
Three “departments” share the same process: **SEO & Audit**, **Publishing**, and **Marketing**. Each has a **Worker** who drafts, a **Manager** who must sign off, and an **Executive** who either wraps up a success or decides what to do after repeated rejection. A **separate** role, **Chief AI**, only appears in a **quality window** (every **tenth** successful approval in a given scope—not every article).

**After the article is already live (optional advisory line)**  
Additional **synthetic** roles (implemented as the same model with different instructions) run **only after** a successful **website** publish: **quality**, **risk**, a **“chief-line process”** checker, a **Compliance Officer** memo, and a **Graphic designer** that only outputs an **image prompt** plus a generated **PNG** when enabled. They inform people; they do **not** act as a second approver for the public site.

---

## 3. End-to-end: from topic to public page (the usual automated path)

This is the story most operators care about: **full pipeline with site publish**.

1. **Topics live in a bank**  
   The system maintains a **queue of content ideas** per **theme** (e.g. cloud, security, developer tools). Each item includes at least: a **primary keyword**, **subcategory**, **content type** (article vs course, etc.), **reference URLs** to ground research, and which **theme** it belongs to. The bank can be refilled on a schedule (search + ranking), subject to rate limits and freshness rules.

2. **A scheduler picks the next theme**  
   A cadence (e.g. hourly) **rotates** which theme is “in focus” so work is spread across lanes instead of one niche forever.

3. **SEO run (first half of the chain)**  
   The **SEO Worker** gets a **task** plus the **next banked topic** for that theme. They produce something like: short **justification** that the keyword is worth Xalura’s audience and fits the **AI/tech** positioning, tied tightly to the keyword.  
   The **SEO Manager** must answer **approved or rejected** on the first line. If rejected, the Worker can revise (up to a few rounds), then the **SEO Executive** may order a full **rewrite** or **discard** the attempt.  
   If approved, the **SEO Executive** writes a **short summary** of what this approval represents. The system also **increments** an internal “cycle” counter (see section 6) and **emits a handoff package**: *here is the keyword, theme, subcategory, sources, and type—ready for Publishing*.

4. **Publishing run (second half)**  
   **Publishing** is **not** allowed to invent a random topic when the chain is run strictly: it needs that **ready-for-publishing** package from SEO. The **Publishing Worker** is instructed with an explicit **editorial contract**: the `#` title and body must **center** the same primary keyword, stay on the same **theme**, and not drift into a generic essay. The draft is **markdown** (e.g. starts with `# Title`); that markdown is what would eventually become the **public body** if the site step runs.  
   The **Publishing Manager** is stricter than other managers: they must **reject** if the piece **pivots** off the handoff.  
   On success, the **Publishing Executive** summarizes, the cycle counter advances again, and—when using handoff mode—a second event records *an article is published* in the internal sense (identifier + title; URL may be filled when the site step runs).

5. **Website publish (turning the draft into a product artifact)**  
   If site publishing is on, the system takes the **approved Publishing Worker output** as the **body**, derives **title** from the markdown heading (or task), **slugifies** for a stable path, optionally asks the **Graphic designer** path for a **one-off hero** (short English prompt, then an image model produces a **PNG**), uploads that image to **file storage** and stores a public **URL** on the article row, then **upserts** the row so the public site can read it. The same run may **re-announce** the publish with the real path, log the topic in a **“already published” ledger**, and trigger **downstream** notifications (digest email, social share hook, optional founder email).

6. **Marketing (downstream, optional in strict mode)**  
   If Marketing is invoked with the same handoff rules, it may **wait** until the “article published” signal exists, then the **Marketing Worker** produces campaign-style copy (e.g. posts, email angles) for **that** piece. Same Worker → Manager → Executive pattern.

**Important:** The **user-visible article** is the **markdown from the Publishing approval**, not the SEO text. SEO output is a **bottleneck and contract**; Publishing output is the **publication**.

---

## 4. What each production role does — every time they are invoked

Below, “**one pass**” means: Worker output → Manager review → (if approved) Executive summary, **unless** the Manager keep rejecting (then escalation rules apply). **Chief AI** is **not** in every pass (see section 6).

### SEO Worker
- **Input:** A defined **task** (e.g. justify the keyword) plus, when the topic bank is used, a **concrete line item**: keyword, subcategory, type, source URLs, theme, optional angle, supporting terms.  
- **Output:** Markdown (or similar) **keyword work** that matches the task—typically **tight, non-fluff** copy tied to that keyword and theme.  
- **When they run again in the same attempt:** If the Manager rejected them, they receive the **rejection reason** and revise (bounded rounds). If the Executive orders a full rewrite after many rejections, they get a “start fresh” instruction.

### SEO Manager
- **Every time:** They **must** start with **APPROVED** or **REJECTED** (machine-parseable), then a **reason**.  
- **Responsibility:** **Quality, brand fit, alignment** with SEO goals—not only grammar. If the Worker went off-brief, they send it back.  
- **If they keep rejecting:** After several rounds, the **SEO Executive** decides **rewrite the whole thing once more** or **drop** the task without incrementing the “quality cycle” counter in a way that would pretend success.

### SEO Executive
- **On approval:** Writes a **short leadership summary** of what was just accepted for the SEO function—useful for logs and downstream context.  
- **On repeated Manager rejection:** Chooses **REWRITE** (one more clean attempt from the Worker) or **DISCARD** (stop; no “successful cycle” for that attempt). The system has a cap so it cannot loop forever.

### Publishing Worker
- **Input:** A **publishing task** (often: write the long-form article) **merged** with a mandatory **handoff block** from SEO: primary keyword, subcategory, content type, **theme** label, **source URLs** to respect, and rules like “**title and lede must serve the keyword**.” An optional “daily production” block may prepend counts (articles done today vs target, course status) so the model stays aware of **throughput** expectations.  
- **Output:** **Markdown** suitable for the site, normally starting with `# ...` for the real title. This is the **candidate public body**.  
- **They are not** supposed to add meta preambles like “As an AI in the department…”; the handoff text forbids that.  
- **Revisions** work the same as SEO: Manager feedback → rewrite; Executive may force a full new attempt or discard.

### Publishing Manager
- **Every time:** Same first-line **APPROVED** or **REJECTED** contract.  
- **Extra rule:** The fixed primary **keyword** from the handoff is a **non-negotiable center of gravity**. They are instructed to **REJECT** if the `#` title or body drifts to a different pillar, generic “audience” fluff, or otherwise **breaks the SEO handoff**. This is the main **publishing quality gate** before the internet sees the long-form.

### Publishing Executive
- Same pattern as SEO Executive: **summary** on success; **REWRITE / DISCARD** after a stuck rejection loop.  
- Their summary is one of the inputs to **emails and advisory** content later, because it describes “what we think we published.”

### Marketing Worker / Manager / Executive
- **Worker:** Produces **distribution** or **campaign** text for the business—again as markdown unless told otherwise, with context that an article may exist.  
- **Manager / Executive:** Same approval and escalation pattern.  
- **In strict handoff mode:** If Marketing runs **before** a publish event exists, the pipeline can **return waiting**—*nothing wrong, just not yet*. That prevents marketing copy that references a non-existent or unpublished asset.

### Chief AI (ladder, not the email)
- **Does not** sit between Worker and Manager.  
- **When they run:** After the **tenth** successful **Manager approval** in a given **counting scope** (either one counter per department, or a **separate** counter per **theme lane** for SEO and Publishing), the system generates an **audit report** and **Chief AI** appends: a **1–10 score**, a one-word class of direction (e.g. scale, optimize, review, change strategy), and **what to do differently in the next ten-window batch**. This is for **governance and calibration**, not for a single article’s go-live.  
- **Distinguish** from the post-publish “chief-line process” analyst, who is a different prompt that comments on one publish’s process quality in an **email** (section 7).

### Graphic designer (publishing / hero, when enabled)
- **Not** a person in the org chart; it is the same generative model **role-played** as a designer.  
- **On site publish (when the flag is on):** The model is asked for **one** **plain-English** image **prompt** (very short) from title + **executive summary** + **keyword** / subcategory so the art matches the **pillar** rather than generic “tech office stock.” An **image** model then renders a **PNG**. That file is **uploaded to object storage**; the article row stores the **image URL** as the public **cover**.  
- **Deduplication:** If the same publish flow already generated the PNG for the site, the **founder email** reuses that asset instead of generating a second time.

### Compliance Officer, Quality assurance, Risk, and “chief-line process” (advisory, after the site is live)
These run **only if** the founder compliance path is **enabled** and a **recipient** is configured. They are **separate** from the Manager chain.

- **Quality analyst:** Reads a **text briefing** (title, slug, paths, **Publishing Manager** approval text, executive summary, **article excerpt**, last cycle log, recent events, recent failures, metrics lines). Produces: **short QA bullets** and a **High/Medium/Low** confidence. **No veto.**  
- **Risk analyst:** Same briefing; first line a **RISK_LEVEL** token; then structured risks grounded in the briefing only. **No veto.**  
- **Chief-line process audit:** Asks: did this publish **look like** it met “chief-level” **discipline** (process quality, not personal judgment)? It does **not** re-run the ladder Chief AI. **No veto.**  
- **Compliance Officer:** Synthesizes the three above, the **rubric** (see below), and the **primary sources in the briefing** to produce: article digest, **D1–D7** score table, **regulatory-style** paragraphs (explicitly *not* legal advice), a **compliance** score and confidence, and a **draft** email the founder could copy—**Cc** lines in the text are for **display** only, not a second mail to Chief or execs. **Still no veto;** the article is already public.

**Compliance rubric in plain language (dimensions the model must score 1–10 on):** Did regulated themes stay in safe “product / research” language? Unsubstantiated or hype claims? Content that could read as personal medical/legal/tax **advice**? Unfair or sharp comparisons? Privacy issues? Undisclosed commercial angles? And did the **Publishing Manager’s** stated reason look proportionate? The model also emits machine-readable **COMPLIANCE_SCORE_OVERALL** and **COMPLIANCE_CONFIDENCE** lines for consistency.

**Failure handling:** If the main model is down, production can fall back to **stub** text; advisory calls can fail individually and the email still assembles with error placeholders where needed.

---

## 5. How “cycles” and “ten approvals” actually work (not every click)

- Each time the **Manager approves** a Worker for a **department** (in a **scope**—either the whole department or a **per-theme** lane for SEO and Publishing), the system records **one more step** in a local **1–2–…–9–10** progress bar for that scope. It also writes a **log entry** (what was asked, what the Worker said, that the Manager approved and why, etc.).  
- The **1–10** counter is about **managers saying yes** to completed work, **not** “one per article for the world.” A single public article may consume **one** of those if one approval **closes** the Publishing task, but in practice the **Worker may need multiple** attempts **before** a Manager approves, and **that** only counts as **one** when approval finally happens.  
- On the **tenth** approval, the system **resets the counter to zero** for the next “window” and issues an **audit** document, then **Chief AI (ladder)** adds the strategic commentary. The **on-disk** log filenames **reuse** the same pattern each window (e.g. cycle-1..10) so a long **historical** archive of every past cycle is not kept automatically—copy logs elsewhere if you need a permanent record.

**Why “lanes” matter:** If you did **not** split SEO and Publishing by **theme**, one vertical could advance the **ten-approval** story while another starves. **Per-theme** counters are supported so, for example, *cloud* and *security* each have their own **1–10** and their own **Chief** audit cadence.

---

## 6. How teams pass work (the internal handoff story)

Conceptually, two messages matter in strict mode:

- **“Keyword is ready for Publishing”** — After SEO approval, a **bundle** is emitted: keyword, optional subcategory, type, sources, **theme** id, label. **Publishing** consumes the **latest** of these when it runs, so the draft is **tied** to the last successful SEO.  
- **“Article is published”** (in the product sense) — After Publishing approval, an event records **an article id, title, optional URL**. **Marketing** can be configured to need this so campaign work references **a real** shipped asset.

In **tests or manual** runs, “skip the upstream check” is allowed so you can run Publishing in isolation, but the **chained, production-like** path enforces the order: **SEO → (signal) → Publishing → (optional site) → (signal) → Marketing**.

---

## 7. What the scheduled “hourly” path does in one tick

- Pick a **theme** in rotation.  
- Run **SEO** with the topic bank for **that** theme, emit **keyword ready** if the run fully approves.  
- Run **Publishing**; it will **use** the latest handoff. If the event was not visible (e.g. mis-ordered in an invalid manual run), Publishing can return **waiting**.  
- If an env flag is set (or a force flag), also **write to the public database**, run **hero image** if that flag is on, and trigger **follow-up** (digest, founder pack, **Zernio**-style post if keys exist). The incremental runner often **skips** the ladder Chief **enrich** for speed; full Chief on audit is still a thing when a department hits **ten** in its own runs.

---

## 8. Marketing’s role (clear scope)

- **Purpose:** **Amplify** what was produced: campaigns, **social** angles, ads, etc.  
- **Not** where the public article text is **authored** for the blog—that is **Publishing**.  
- In handoff-strict mode, it **waits** for a publish event so the Worker has a **concrete** topic to market.

---

## 9. What can block or end without a publish

- **Topic bank empty** or not refreshable: SEO may **not** start a Worker, or return **blocked**.  
- **Publishing** without a prior handoff: **Waiting** (by design) or, in loose mode, still draft but you lose end-to-end consistency.  
- **Site** step: missing database credentials, or “require cover on publish” on without hero generation enabled, **fails the publish** even if the draft was approved.  
- **Manager never approves** after rewrite rounds: **Discard** with no live article.  
- **Model outages:** Stubs and retry queues; operations can be logged to a **failure queue** for humans.

---

## 10. Reference: every named role in one place

| Role | Part of the approval ladder? | When they run / what they do |
|------|------------------------------|------------------------------|
| **SEO Worker** | Yes | Drafts keyword/audit-style work for the handoff. |
| **SEO Manager** | Yes | Approve or reject; first line is the decision. |
| **SEO Executive** | Yes | Short summary, or **rewrite/discard** after a jam. |
| **Publishing Worker** | Yes | Writes the **public-bound markdown** article; must obey **keyword + theme** contract. |
| **Publishing Manager** | Yes | Hard gate: **on-keyword** and handoff **fidelity**. |
| **Publishing Executive** | Yes | Same as SEO Executive. |
| **Marketing Worker** | Yes | **Campaign/amplification** text about shipped or assigned work. |
| **Marketing Manager** | Yes | Approve or reject. |
| **Marketing Executive** | Yes | Summarize or rewrite/discard. |
| **Chief AI (ladder)** | No (runs after 10th approval in scope) | **Strategic** score + directive for the next batch; **not** a per-article go-live check. |
| **Graphic designer** | No | **Prompt** + **image**; optional **on-site** cover. |
| **Quality / Risk / Chief-line process (advisory)** | No | Post-live **email**; ground in briefing only. |
| **Compliance Officer (advisory)** | No | Synthesizes rubric + **draft** founder email; **advisory** only. |

---

## 11. Glossary of easy confusions

| Phrase | Meaning here |
|--------|---------------|
| **Cycle** (1–10) | Counts **Manager approvals** in a **scope** toward a periodic **audit + Chief AI** comment. **Not** “one article” by itself. |
| **Keyword ready** | Internal “SEO passed; this is the **contract** for Publishing.” |
| **Article published (event)** | “Publishing passed” plus identity for Marketing; the **public URL** may be added when the **site** step runs. |
| **Chief AI** vs **chief-line process** | The first is the **ladder** boss on a **10-pack** of approved work. The second is a **one-off** email assistant judging **this** publish’s process. |

---

*This briefing reflects the system as implemented. For file-level pointers and environment variables, see the shorter technical README inside the `xalura-agentic` package.*
