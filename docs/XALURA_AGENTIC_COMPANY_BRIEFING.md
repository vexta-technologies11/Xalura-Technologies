<div align="center">

# Xalura Technologies  
## Agentic Content & Web Platform

### Strategic Briefing & Proposal-Style System Narrative

Document type: Client / partner–ready report  
Version: 2.0  
Status: For discussion, strategy, and board-level orientation — not a legal or investment offering

</div>

---

## Document control

| Field | Detail |
|--------|--------|
| Purpose | Single narrative of what the product and website *are*, how the AI agentic workforce is organized, and how long-form articles and news move from idea to live page. |
| Audience | Founders, strategic partners, investors in early diligence, and operating executives who will *run* the machine — not only engineers. |
| What this is not | Source-code documentation, environment-variable reference, or a substitute for legal review of published claims. |
| Companion material | `docs/agentic-workflows.md` and `xalura-agentic/README.md` for technical conspectus. |
| How to read | § Executive summary first, then §1–3 for the “company” story, §4–8 for workflows, §9+ for roles and appendices. |

---

## Table of contents

1. [Executive summary](#executive-summary)  
2. [The engagement: what we are proposing you understand](#1-the-engagement-what-we-are-proposing-you-understand)  
3. [The public face: website and product surface](#2-the-public-face-website-and-product-surface)  
4. [The control plane: what operators run behind the curtain](#3-the-control-plane-what-operators-run-behind-the-curtain)  
5. [Organizational model: a virtual company inside the codebase](#4-organizational-model-a-virtual-company-inside-the-codebase)  
6. [Universal production ladder: Worker, Manager, Executive (in action)](#5-universal-production-ladder-worker-manager-executive-in-action)  
7. [Department deep dives: SEO, Publishing, Marketing + scenes](#6-department-deep-dives-seo-publishing-marketing--scenes)  
8. [The ten pillars: strategic columns of the article library](#7-the-ten-pillars-strategic-columns-of-the-article-library)  
9. [Governance windows: the 1–10 cycle and two kinds of “Chief”](#8-governance-windows-the-1-10-cycle-and-two-kinds-of-chief)  
10. [Article pipeline: end-to-end story + failure modes](#9-article-pipeline-end-to-end-story--failure-modes)  
11. [News pipeline: a second newsroom + drama of the day](#10-news-pipeline-a-second-newsroom--drama-of-the-day)  
12. [Post-publish advisory: compliance, quality, risk (no veto)](#11-post-publish-advisory-compliance-quality-risk-no-veto)  
13. [Ryzen Qi: email, inbound command, operator brain](#12-ryzen-qi-email-inbound-command-operator-brain)  
14. [Observability: where truth lives](#13-observability-where-truth-lives)  
15. [Glossary and moat talk track](#14-glossary-and-moat-talk-track)  
16. [Cast & authority matrix (nameplate directory)](#15-cast--authority-matrix-nameplate-directory)  
17. [Closing statement](#16-closing-statement)  
18. [Appendices: heartbeat, honesty, brainstorm prompts, narrative vs. invoice](#appendices)  

---

## Executive summary

Xalura Technologies (public brand: Xalura Tech) is presented as a technology and content company whose public website and agentic automation are a single system: visitors read articles and news produced under a governance model that mimics a real media organization (Workers draft; Managers sign off; Executives break ties or discard wasteful attempts).

Two product lines in one house

- Long-form article library — Ten editorial pillars (e.g. small-business automation, dev productivity), each with optional named Workers so voice can stay consistent per column. A topic bank feeds SEO, which hands a contract to Publishing, which produces the markdown that can become a public URL when the site publish step succeeds. Marketing amplifies after an article-published signal when the chain is strict.  
- News desk — A faster, citation-driven path: pre-production picks a lead from a real pool; writers draft; Chief of Audit (executive) verifies or pushes back; head-of-news logging and optional hero art; then news goes live. No “keyword handoff” in the SEO sense—truth and pool quality are the center of gravity.

Why this document exists for a client or partner conversation

- To separate *story* from *invoice*: the “team” is governed prompts and schedules; the margin is positioning, pillar strategy, and trust—not only API spend.  
- To make drama legible: rejections, rewrites, discards, and “waiting” are not random failures; they are how the system refuses to ship garbage on autopilot.  
- To set expectations: post-publish advisory work (compliance, risk, quality) documents what happened; it does not 404 a live page.

Key differentiator in one line: *Structured newsroom behavior at scale* — not a single “chat to blog” pipe, but a ladder with teeth.

---

## 1. The engagement: what we are proposing you understand

We are not asking the reader to learn code. We are asking you to internalize a contract:

> The product is trust in process: every serious piece of content passes human-parseable gates (Manager APPROVED / REJECTED; Executive REWRITE / DISCARD), and separate advisory layers add paper trail after the world can already see the page.

If you are evaluating partnership, investment, or go-to-market, the questions this document helps answer are:

- *How does the brand avoid being “just another AI blog”?*  
- *How does news stay defensible under scrutiny?*  
- *What cannot the automation do—so you plan human oversight?*  
- *What operating rhythm (crons, handoffs) should the C-suite expect?*

---

## 2. The public face: website and product surface

### 2.1 Dual nature of the application

The Next.js site is:

| Layer | What the client experiences |
|--------|----------------------------------|
| Public | Home and brand storytelling; team; courses; article library and article detail; news listing and news articles; optional AI tools (content, report, email helpers) where the product enables them. |
| Control | Admin dashboards, hierarchy / live views of agentic activity, Zernio-related marketing controls where configured, team/employee CMS. |

> Scene — The 11:00 investor walkthrough  
> A visitor scrolls a pillar filter and opens an article. Under the hood, that article may have been touched by a column-specific Worker name, two Manager layers (SEO, then publishing), a site upsert, and optionally a Zernio line post. The read experience is calm; the production story is not.

### 2.2 Invisible to visitors: the “content factory”

The same application hosts APIs and scheduled jobs that run the LLM ladder, event queue handoffs, topic bank selection, and downstream email and distribution hooks. The website is both storefront and factory floor.

Data the business stands on (conceptual)

- Supabase — articles, news items, page content, team, pipeline logs, news run events, email threads, optional Zernio marketing state, agent names.  
- On-disk / worker state — cycle counters (1–10), rotating logs, failed-operations queue, `KEYWORD_READY` / `ARTICLE_PUBLISHED` semantics, optional strategy JSON per lane.

---

## 3. The control plane: what operators run behind the curtain

- API — `POST` department runs (SEO, publishing, marketing) with the same Worker / Manager / Executive pattern; publishing can call site publish so the DB gets the approved markdown.  
- Crons (illustrative) — Hourly incremental topic-bank path; ~2h full publishing + site in many deployments; ~3h full news pipeline; frequent Chief sweep (ops / trends, not Serp-heavy in that path). *Exact* schedules are infrastructure; the LCM(2,3) = 6h fact means some UTC hours stack long-form and news crons—capacity and budget matter.  
- Email paths (optional, separate flags) — Post-publish Chief digest; founder / compliance pack; CEO outcome one-pager for success/fail narrative; news dual-digest in some configurations. *None* of these replaces the others; they are parallel channels.

---

## 4. Organizational model: a virtual company inside the codebase

Departments (production ladder)  
SEO & Audit, Publishing, Marketing — each: Worker → Manager → Executive for the work product that counts as “done” for that stage.

News (parallel org)  
Pre-Production (Worker/Manager) → Writers (Worker/Manager) → Chief of Audit (Executive) → head-of-news artifact and logging → Photographer (optional) → publish.

Personas the CEO sees in copy

- Ryzen Qi — CAI | Head of Operations — *operator voice* in inbound mail, digests, and narration to the Boss when those paths are on.  
- Richard Maybach (configurable) — Chief of Audit on the news line — the adversarial *truth* layer in the news run and in some CEO emails.  
- Martin Cruz — Head of Compliance — advisory founder-facing synthesis, not a pre-public blocker.

> Scene — The Monday morning email  
> The CEO opens one Ryzen-narrated note: the machine is reporting what shipped, what bounced at a Manager line, and (if enabled) a separate factual tail from the failed queue—*not* mixed with the compliance PDF-of-the-soul, unless the product team wired both.

Graphic / hero is played as a “designer” — it generates a short prompt and a PNG; it can block publish *only* when “require cover” is on and the art + upload path fails.

Governance rule to memorize  
The Manager is the hard gate per pass. The Executive is the surgery on a jammed line. The 10-approval Chief (ladder) is not in the middle of every article—it is a batch strategy role *after* ten approvals in a scope.

---

## 5. Universal production ladder: Worker, Manager, Executive (in action)

Mechanical truth (same for SEO, publishing, marketing): `runDepartmentPipeline` drives revisions, rejection history, and escalation phases until an outcome: approved, rejected, error, discarded, rejected after escalation, or blocked (e.g. topic gate).

### 5.1 The Worker: motion, not magic

| Step | What the Worker *does* (human terms) |
|------|--------------------------------------|
| 1. Receives a task | A fully loaded brief: the original instruction plus (for SEO) topic row and optional SERP / crawl context; (for publishing) a pasted keyword handoff block; (for marketing) a brief that may depend on a publish event. |
| 2. Produces a draft | Markdown (or structured text) within role—research tone for SEO, long-form for publishing, campaign copy for marketing. Strategy overlays can prepend “this quarter we lean into *X*.” |
| 3. Eats feedback | On REJECTED, the Worker does not get a clean slate unless the Executive orders a REWRITE after a jam—round one is “fix what the Manager said.” The narration in logs is increasingly tense if the same reason repeats. |
| 4. Escalation | If the Manager still refuses after the allowed rounds, the Executive appears: one word on the first line of that decision—REWRITE or DISCARD—then explanation. A REWRITE is a moral reset for the Worker: *forget the acceptable middle; start again*. |

> Scene — The third rejection (publishing column)  
> The Publishing Worker—say Jordan on the *content marketing* pillar—thought the piece was *sparkling*. The Manager’s first line: REJECTED. *“The lede is generic ‘AI and the future’; the handoff says content repurposing in mid-market B2B; you pivoted to brand awareness.”*  
> Jordan (the model) revises. REJECTED again. The reason sharpens. On the escalation, the Publishing Executive stares (metaphorically) at both and says: REWRITE — *not* because the world needs more drafts, but because the pivot broke contract with SEO and the entire library’s attribution story.  
> Drama = clarity: without this fight, the public site would read like every AI blog.

### 5.2 The Manager: the editor-in-chief of the pass

- Line one must be machine-legible (APPROVED / REJECTED). Power: stops the conveyor until the Worker earns the next stage.  
- Publishing Manager is explicitly a pivot guard—*your keyword and pillar or nothing goes out*.

### 5.3 The Executive: the stop-loss

- On approval: summary of what the company believes it committed (used downstream in emails and context).  
- On jam: REWRITE vs DISCARD—emotional translation: *we are not funding this run anymore* vs *we are funding one new run*.

### 5.4 Optional “senses” (Phase 7) for the SEO Worker

With keys, the SEO Worker can see the SERP, GSC hints, and crawled sources—*inputs* to a document, not a bypass of the Manager. The drama here is: data-rich drafts can still be rejected for brand or wrong fight.

### 5.5 Agent lanes and pillar Workers

Ten public subcategories map to lane ids; SEO and Publishing can use per-pillar Worker names (e.g. Rina Shah on *dev productivity*) so the byline and voice feel like specialists, not one monolith.

---

## 6. Department deep dives: SEO, Publishing, Marketing + scenes

### 6.1 SEO & Audit

Mandate  
Package a keyword + theme + sources that Publishing must not ignore.

Powers  
- Stops bad fits before the long-form investment.  
- Emits `KEYWORD_READY` / handoff—the veto point for “we are not writing this long-form on a hallucinated strategy.”

Limitations  
- Does not ship the public article.  
- Topic bank empty or locked → blocked—*not* the Worker’s fault; it’s a scheduling problem.

> Scene — The Friday SEO pass  
> The SEO Worker in the e-commerce lane assembles a tight brief; the Manager is satisfied. The Executive logs a one-paragraph “why this keyword matters now.” That night, Publishing *inherits* a package the Worker did not invent in isolation—the drama is continuity across days.

### 6.2 Publishing

Mandate  
The markdown the world will read, locked to the handoff.

Powers  
- Pivot guard (Manager).  
- Optional “daily” production prefixes so the model sees throughput *targets*—*operations* in the same breath as *creativity*.

Tragedy you should understand  
- Approved in the ladder but site publish fails (DB, cover when required): the art is right; the world never sees it until ops fixes. This is a different kind of emergency than a rejected draft.

### 6.3 Marketing

Mandate  
Distribution and angle—not the canonical blog body.

Powers  
- In strict handoff, may return waiting if no ARTICLE_PUBLISHED—*professional patience*, not a bug.  
- Marketing Zernio (when on): pick a recent article in a time window and post under cooldown state—*distribution discipline* in DB form.

> Scene — The eager marketer  
> The Marketing Worker wants to roar about a campaign before the asset is in the DB. The system says wait. *That’s* brand safety—not *slow* AI.

---

## 7. The ten pillars: strategic columns of the article library

1. AI for Small Business Automation  
2. AI for Content Creation & Marketing  
3. AI for Customer Support & Chatbots  
4. AI for Software Development Productivity  
5. AI for E-commerce Personalization  
6. AI for Workplace Productivity & Task Management  
7. AI for Creative Design  
8. AI for Data Analysis & Insights  
9. AI for Education & Learning Tools  
10. AI for Personal Productivity  

Client framing  
We are not building one generic AI blog; we are building ten lighthouses—sponsor, SEO, and BD can align to columns the code already separates.

---

## 8. Governance windows: the 1–10 cycle and two kinds of “Chief”

What a cycle is *not*  
- Not “one article in the world.”

What it is  
- Each Manager approval in a scope advances +1 toward 10; the tenth triggers a formal audit file and Chief AI (ladder) strategic commentary (score, class of direction) for the next batch—*program* calibration, not a takedown of a single URL.

Two Chiefs — do not conflate

| | Chief AI (ladder) | Ryzen Qi (email / inbound) |
|--|------------------------|----------------------------------|
| When | After tenth approval in scope | Inbound mail, digests, outcome reports when enabled |
| Job | Batch strategy on trends in work | Narration to human; optionally invokes same model family as orchestrator voice |
| Powers | None to unpublish | Can trigger command actions in inbound parse; not a compliance veto |

> Scene — The audit  
> Nine approvals in the small-business automation lane. The tenth approval lands. The audit file is written. Chief (ladder) does *not* congratulate. Chief *judges the program*—*scale, tighten, change the pillar mix*—executive drama at the batch level: you are not being petted; you are being governed as a content program.

---

## 9. Article pipeline: end-to-end story + failure modes

Happy path (stages)  
1. A topic row lives in the topic bank (keyword, subcategory, vertical, references, type as configured).  
2. SEO run: Worker → Manager → on approval, Executive summary; `KEYWORD_READY` and handoff payload emit.  
3. Publishing run: Worker is bound to the handoff; Manager is the pivot guard; on approval, Executive summary, recordApproval, and internal publish signals as configured.  
4. Site publish (when on): title/slug, optional hero, upsert public row, optional Zernio for the article, ledgers and events.  
5. Advisory (compliance, etc.) may run after the page exists—does not unpublish.  
6. Marketing in strict handoff waits for a real ARTICLE_PUBLISHED signal, then W/M/E for distribution copy.  
7. In parallel over time: 1–10 cycle progress; on the tenth Manager approval in scope, audit + ladder Chief (not the same as every single article).  

| Mode | What the stakeholder should feel | Why the “drama” is a feature, not a bug |
|------|----------------------------------|----------------------------------------|
| Waiting | Patience—no fake “live” link. | Marketing in the green room while the asset is still in progress; no embarrassing announcement of a ghost URL. |
| Blocked | *Supply*—no work item to pick. | Not a failing Worker; the planner (topic bank, gate) is empty or closed. |
| Rejected | Tension—line one is REJECTED with a reason. | The rejection is durable in logs—training the program and forensics for humans. |
| Discarded | The run stops—sunk draft cost. | Executive REWRITE/DISCARD is the moral line that kills a runaway brief; cheaper than a public mistake. |
| Site error | Ops—prose approved, pipe broke. | Different from editorial drama; outcome email (if enabled) separates technical from manager rejection for the CEO. |

---

## 10. News pipeline: a second newsroom + drama of the day

Before you read the stages, hold this image: a glass-walled newsroom where the internet is loud and the chain of command is still W/M/E—twice before the executive of record (Chief of Audit) even touches the draft.

Stages (full run)  
1. Pre-production — pool & excerpts — System gathers a pool of same-day and recent items (search-style pool + crawl excerpts when configured). *Failure* here: technical; stage names like `preprod_gather` tell the CEO the internet feed, not a Manager, was the problem.  
2. Pre-production — 30-item checklist — A forced breadth so one echo chamber does not own the run. *Failure* here: pipeline or data; again ops, not *ethics* yet.  
3. Pre-Production Worker / Manager — The preprod Worker picks one lead story; the Manager (e.g. Nina in config) may REJECT and demand another pick. Max rounds, then aborted at `preprod_manager`: the drama is *no pool story was good enough to put our masthead on this run*.  
4. Writers Worker / Manager — Factual, neutral markdown grounded in a source pack; the Writer Manager may REJECT and force prose revision. Max rounds → aborted at `writer_manager` — *we refuse to ship that tone or lede*.  
5. Chief of Audit (Executive — e.g. Richard in default text) — First line VERIFIED vs unverified / misleading; independent SERP to cross-check claims. Bounded retries can re-roll pre-prod and writer blocks.  
6. Head of News / digest to disk — Durable head file (run id in the path) for lineage.  
7. Photographer (optional) — Image brief, upload a news cover. If it fails, the post may still go live without art, depending on configuration.  
8. Publish to site — `news` row with citations, primary source URL, and provenance fields.  
9. Post-publish emails (optional, env-gated) — In some configurations, two stylized threads (operations + Chief of Audit) to the CEO inbox, with CC to the news desk; separate from optional outcome reports.  

> Scene — 2:00 p.m., the wrong story (three beats)  
> *Beat 1 — Selection.* Pre-Prod loves a splashy headline. The Manager (Nina) first line: REJECTED—*we are already overweight this industry in the checklist; this run is about diversity of sourcing.* The Worker returns to the pool, picks a quieter lead, and earns the next pass.  
> *Beat 2 — Voice.* Draft two is strong on the beat but leaks an internal acronym into the lede. The Writer Manager (Sage): REJECTED—*fix the lede so the story does not read like an R&D Slack thread.* *Boring* drama; saving reputation.  
> *Beat 3 — Truth vs. speed.* Richard (Chief of Audit) runs independent checks. A timestamp in the source pack disagrees with a time claim—first line UNVERIFIED; the line re-runs. When it finally says VERIFIED, the room (even a synthetic one) can exhale: the brand bought a short delay not to ship a time bomb.

| Dimension | Articles (library) | News (desk) |
|------------|------------------------|-----------------|
| Strategic center | Keyword + pillar handoff (SEO → Publishing) | Pool quality + verification (pre-prod, writers, audit) |
| Executive of record (product sense) | Publishing Executive (what we store in the summary) | Chief of Audit (is this defensible *as* news?) |
| Manager tension | Two ladders in series (SEO then Publishing), each with Rounds | Two W/M pairs in front of the executive |
| Typical cron story | ~2 h full + ~1 h incremental (varies by deploy) | ~3 h windows in the documented grid |
| Zernio (typical) | Often tied to on-publish for the article | N/A in the digest narration in one path (“not Zernio” for news in that line); separate Marketing Zernio state is a different lever |

---

## 11. Post-publish advisory: compliance, quality, risk (no veto)

| Role | In plain English | Power (within the “company” story) |
|------|------------------|-------------------------------------|
| Quality analyst | “Did the on-page text do what our brief said it would?” | Informs the founder / compliance pack—no takedown. |
| Risk analyst | Structured, briefing-grounded risk narrative; often a RISK_LEVEL-style first line. | Informs; not a veto on the public row. |
| Chief-line process | “Did this run behave like a disciplined executive process?” | Informs; meta-commentary on how the ladder behaved, not re-judging the Manager. |
| Martin Cruz (Compliance, advisory) | Synthesises D1–D7-style rubric scores, a compliance read, and display-only draft email with Cc lines for stakeholder politics. | Informs; explicitly not legal advice. |
| Graphic (reuse in email) | Reuse or attach hero bytes in the compliance pack when available. | Visual continuity in the inbox; not a second go/no-go on the public URL. |

> The line we do not cross in this script  
> Advisory does not retract a URL. The ladder already chose to ship. Advisory is for adults—boards, LPs, and conscience. The drama is honest: if the rubric finds a hair on fire, the right human still owns the response; the code does not fake a court or a law firm.

---

## 12. Ryzen Qi: email, inbound command, operator brain

- Inbound command path (when Resend and parsing are enabled): extract a structured command block from the message, run a named pipeline (e.g. publishing and site upsert) under the same W/M/E governance as a cron, then reply in thread with Chief memo and signature shell.
- Power story: the CEO is not locked into the admin console—if the mail path is healthy, the same machine the schedulers use can be steered from a thread.

> Scene — 2:12 a.m., one paragraph of instruction  
> A Run button you did not open. Ryzen (the narrated Chief voice) does not *sleep*, but infrastructure *can* fail. The drama is binary: (a) the same fight the 2 p.m. cron just had, or (b) a polite refusal in the thread—*couldn’t parse / not authorized / key missing*—so the boss is not gaslit into thinking work ran when it did not.

---

## 13. Observability: where truth lives (proposal-style list)

1. Supabase pipeline / agentic logs (when on) — Per department, lane, stage, and summary. Control-tower view for “where did it die?”  
2. News run events (database) — Stage-by-stage timeline. Reconstruct a bad run blow by blow without scapegoating a synthetic name first.  
3. Event queue — Order of `KEYWORD_READY` and `ARTICLE_PUBLISHED` when the strict chain is respected. Proof the sequence was right—or was not.  
4. Failed-operations queue (Resend, upload, model timeout, Zernio) — Often a tail in CEO-facing outcome or digest copy. The unsexy truth: even a blessed ladder outcome can die at the post office (integration).  
5. On-disk — News head files and per-cycle logs for long-form. Archaeology for engineering and postmortems.

---

## 14. Glossary and moat (talk track)

| Term | Meaning in this system |
|------|-------------------------|
| Handoff | A durable event + payload (e.g. keyword ready), not a figure of speech. |
| Topic bank | Strategic queue; who refills and how often is a business + ops choice. |
| Lane / pillar | A strategic column; may have its own 1–10 window in some deployments. |
| W / M / E | Worker, Manager, Executive — the universal triple in each production ladder. |
| Zernio | Downstream distribution (when keys, flags, and state permit); separate from W/M/E approval. |

Moat in plain English (client-facing)

1. Editor-shaped governance — Managers with rejection teeth, not a one-button “blog it.”  
2. Ten lighthouses (pillars), not one gray sludge ocean.  
3. A dedicated news desk with a named adversary for truth in the product story (Chief of Audit).  
4. Advisory compliance, risk, and quality narration for stakeholders—without the system pretending to be a law firm.  
5. The same engine from crons and from the CEO’s inbox when wiring and auth succeed.

---

## 15. Cast & authority matrix (nameplate directory)

| Role | Stops a public URL? | In CEO-facing channels? | One line of “drama” (story beat) |
|------|----------------------|-------------------------|----------------------------------|
| SEO (W, M, E) | Stops before handoff; Executive can DISCARD | Via logs, rejection reasons | *“No long-form is built on a strategic lie we let through SEO.”* |
| Publishing (W, M, E) | Stops on pivot / draft; DISCARD ends the run | Executive summary in many advisory paths | *“The public paragraph is my problem until I bless it.”* (Manager) |
| Marketing (W, M, E) | Does not delete the blog row; blocks or revises campaign copy | When marketing mail runs | *“I amplify—I don’t mint the canonical long-form asset.”* |
| Chief AI (ladder) | No unpublish | Audit file, batch score | *“I score the program, not your soul.”* |
| Pre-prod (news W/M) | Aborts with no public news | Stage logs, outcome mail | *“No pool item worth the masthead this run.”* |
| Writer (news W/M) | Same, at prose gate | Stage logs | *“Wire tone, not a LinkedIn puff.”* |
| R. Maybach (Chief of Audit) | Until VERIFIED (or retries exhausted) | News CEO threads in some configs | *“I am the independent jury for truth in this run.”* |
| Ryzen Qi (CAI, Ops) | Inbound can start / not start a run | Digests, outcome, inbound | *“Boss—plain English, same governance as the cron.”* |
| M. Cruz (compliance, advisory) | No | Founder / compliance pack | *“I advise—I do not unpublish.”* |
| Human CEO | Always (out of band) | Always | *“Liability and narrative to the world still live here.”* |

---

## 16. Closing statement

Xalura Technologies, as this repository implements it, is a unified public front and a private factory in one: pillar–strategized long-form, a parallel newsroom with a named adversary for truth, batch governance (1–10 and ladder Chief), and advisory drama after the fact—for boards, LPs, and consciences. The machine is honest about its limits: advisory never pretends to be a court; the ladder already decided what shipped.

---

## Appendices

### Appendix A — Operational heartbeat (production rhythm)

- Long-form (typical): about 2 h for a full SEO→publishing→site run (deployment-dependent) plus about 1 h for incremental topic work—independent clocks, coordinated by events and the topic bank.  
- News: about 3 h between full news runs; early failure = supply or checklist; late failure = verification or database.  
- 6 h LCM of 2 h and 3 h crons: at some UTC hours, two heavy jobs can land in the same minute—C-suite concern: API budget and rate limits, not “drama” inside the W/M/E ladder.

### Appendix B — What we do not claim (intellectual honesty)

- Compliance and risk text is advisory—not a substitute for your counsel, jurisdiction-specific review, or outside press counsel.  
- The news Chief of Audit is a governance layer—not a wire service, EIC, or defamation counsel.  
- Spot-check the highest-stakes public pieces. Scale bought a ladder; it did not buy infinite substantive human edits.

### Appendix C — Partner brainstorm prompts (room-ready)

- Which pillar do we sponsor first (events, paid, B2B lead magnets)?  
- Breaking vs slow, verified news: tune pool size, manager rounds, audit retries in ops (environment), not in this document.  
- How many emails to the CEO (digest, compliance, outcome)?  
- Align human brand voice with Ryzen-style narration so the market meets one company, not two.  
- Hire a human EIC on top of the synthetic “editors”: the system equips them; it does not replace their art.

### Appendix D — Narrative layer vs. execution layer

- Narrative — Names in `agents.json`, memos, and “desk” roles exist so humans can operate the org story; they do not imply separate model weights per name.  
- Execution — Concurrency, batch size, and API bills belong to finance and infrastructure.  
- Together they describe the true cost and the true narrative the board can defend.

---

End of report  

*Document version: 2.0 — client / proposal–style system narrative. Not a legal, investment, or product warranty.* For technical detail, use `docs/agentic-workflows.md` and the `xalura-agentic` README.

