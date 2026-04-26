"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PAGE_CONTENT } from "@/lib/constants";
import type { PageContentMap } from "@/types/content";

/** Sections editable on the live home page (Founder + Where we are going removed from layout). */
type EditableTabId = Exclude<keyof PageContentMap, "founder" | "closing">;

const TABS: { id: EditableTabId; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "homePage", label: "Home: feed & tools" },
  { id: "teamPage", label: "Team page" },
  { id: "mission", label: "Mission" },
  { id: "brand", label: "Brand" },
  { id: "gearmedic", label: "GearMedic" },
  { id: "footer", label: "Footer" },
];

function cloneContent(m: PageContentMap): PageContentMap {
  return JSON.parse(JSON.stringify(m)) as PageContentMap;
}

function stableStringify(m: PageContentMap): string {
  return JSON.stringify(m);
}

export function HomepageEditor() {
  const [content, setContent] = useState<PageContentMap>(() => cloneContent(DEFAULT_PAGE_CONTENT));
  const [baseline, setBaseline] = useState<PageContentMap>(() => cloneContent(DEFAULT_PAGE_CONTENT));
  const [tab, setTab] = useState<EditableTabId>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const dirty = useMemo(
    () => stableStringify(content) !== stableStringify(baseline),
    [content, baseline],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("page_content").select("section, content");
    if (error) {
      setMsg({ type: "err", text: error.message });
      setLoading(false);
      return;
    }
    const next = cloneContent(DEFAULT_PAGE_CONTENT);
    for (const row of data ?? []) {
      if (!row.content || typeof row.content !== "object") continue;
      const partial = row.content as Record<string, unknown>;
      switch (row.section) {
        case "hero":
          next.hero = { ...next.hero, ...partial } as PageContentMap["hero"];
          break;
        case "mission":
          next.mission = { ...next.mission, ...partial } as PageContentMap["mission"];
          break;
        case "brand":
          next.brand = { ...next.brand, ...partial } as PageContentMap["brand"];
          break;
        case "gearmedic":
          next.gearmedic = { ...next.gearmedic, ...partial } as PageContentMap["gearmedic"];
          break;
        case "homePage":
          next.homePage = { ...next.homePage, ...partial } as PageContentMap["homePage"];
          break;
        case "teamPage": {
          const p = partial as Record<string, unknown>;
          next.teamPage = {
            meetHeadline: (p.meetHeadline as string) ?? next.teamPage.meetHeadline,
            meetHeadlineEmphasis: (p.meetHeadlineEmphasis as string) ?? next.teamPage.meetHeadlineEmphasis,
            footerStripTitle: (p.footerStripTitle as string) ?? next.teamPage.footerStripTitle,
            footerStripCta: (p.footerStripCta as string) ?? next.teamPage.footerStripCta,
            footerStripHref: (p.footerStripHref as string) ?? next.teamPage.footerStripHref,
          };
          break;
        }
        case "founder":
          next.founder = { ...next.founder, ...partial } as PageContentMap["founder"];
          break;
        case "closing":
          next.closing = { ...next.closing, ...partial } as PageContentMap["closing"];
          break;
        case "footer":
          next.footer = { ...next.footer, ...partial } as PageContentMap["footer"];
          break;
        default:
          break;
      }
    }
    setContent(next);
    setBaseline(cloneContent(next));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const rows = TABS.map(({ id }) => ({
      section: id,
      content: content[id],
    }));
    const results = await Promise.all(
      rows.map((r) =>
        supabase.from("page_content").upsert(r, { onConflict: "section" }),
      ),
    );
    const err = results.find((r) => r.error)?.error;
    setSaving(false);
    if (err) {
      setMsg({ type: "err", text: err.message });
      return;
    }
    setBaseline(cloneContent(content));
    setMsg({ type: "ok", text: "All homepage sections saved." });
  }

  function cancel() {
    setContent(cloneContent(baseline));
    setMsg(null);
  }

  function exitClick(e: React.MouseEvent) {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      e.preventDefault();
    }
  }

  const featuresText = content.gearmedic.features.join("\n");

  return (
    <div className="admin-card admin-card-pad">
      <div className="admin-toolbar">
        <div>
          <span className={`admin-badge ${dirty ? "" : "admin-badge--muted"}`}>
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
        </div>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-btn admin-btn--secondary" disabled={!dirty} onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save all"}
          </button>
          <Link
            href="/admin"
            className="admin-btn admin-btn--ghost"
            onClick={exitClick}
            style={{ textDecoration: "none" }}
          >
            Exit
          </Link>
        </div>
      </div>

      {msg ? (
        <p className={`admin-msg ${msg.type === "ok" ? "admin-msg--ok" : "admin-msg--err"}`} style={{ marginBottom: 18 }}>
          {msg.text}
        </p>
      ) : null}

      {loading ? (
        <p className="admin-help" style={{ margin: 0 }}>
          Loading homepage copy…
        </p>
      ) : (
        <>
          <div className="admin-tabs" role="tablist" aria-label="Homepage sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`admin-tab ${tab === t.id ? "admin-tab--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "hero" ? (
            <div className="admin-field-grid">
              <label className="admin-label">
                Label
                <input
                  className="admin-input"
                  value={content.hero.label}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, label: e.target.value } })}
                />
              </label>
              <label className="admin-label">
                Headline (line breaks allowed)
                <textarea
                  className="admin-textarea"
                  value={content.hero.headline}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headline: e.target.value } })}
                />
              </label>
              <label className="admin-label">
                Subhead
                <textarea
                  className="admin-textarea"
                  value={content.hero.subhead}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, subhead: e.target.value } })}
                />
              </label>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Primary CTA
                  <input
                    className="admin-input"
                    value={content.hero.primaryCta}
                    onChange={(e) =>
                      setContent({ ...content, hero: { ...content.hero, primaryCta: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  Secondary CTA
                  <input
                    className="admin-input"
                    value={content.hero.secondaryCta}
                    onChange={(e) =>
                      setContent({ ...content, hero: { ...content.hero, secondaryCta: e.target.value } })
                    }
                  />
                </label>
              </div>
              <label className="admin-label">
                Bento hint (small line above the fold; optional)
                <input
                  className="admin-input"
                  value={content.hero.bentoHint ?? ""}
                  onChange={(e) =>
                    setContent({ ...content, hero: { ...content.hero, bentoHint: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          {tab === "homePage" ? (
            <div className="admin-field-grid">
              <p className="admin-help" style={{ margin: "0 0 12px" }}>
                Everyday tools block, running ticker, and the News + Articles section headings on the public home
                page.
              </p>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Tools block — small label (above headline)
                  <input
                    className="admin-input"
                    value={content.homePage.everydayLabel}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, everydayLabel: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label">
                  Tools block — CTA to all tools (link text)
                  <input
                    className="admin-input"
                    value={content.homePage.allToolsCta}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, allToolsCta: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              <label className="admin-label">
                Tools block — main headline
                <input
                  className="admin-input"
                  value={content.homePage.everydayHeadline}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      homePage: { ...content.homePage, everydayHeadline: e.target.value },
                    })
                  }
                />
              </label>
              <label className="admin-label">
                Tools block — subhead (paragraph under headline)
                <textarea
                  className="admin-textarea"
                  value={content.homePage.everydaySubhead}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      homePage: { ...content.homePage, everydaySubhead: e.target.value },
                    })
                  }
                />
              </label>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  CTA link (path)
                  <input
                    className="admin-input"
                    value={content.homePage.allToolsHref}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, allToolsHref: e.target.value },
                      })
                    }
                    placeholder="/ai-tools"
                  />
                </label>
              </div>
              <h3 className="admin-h3" style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 600 }}>
                Tool cards
              </h3>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Email — title
                  <input
                    className="admin-input"
                    value={content.homePage.toolEmailTitle}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, toolEmailTitle: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label">
                  Content — title
                  <input
                    className="admin-input"
                    value={content.homePage.toolContentTitle}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, toolContentTitle: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Report — title
                  <input
                    className="admin-input"
                    value={content.homePage.toolReportTitle}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, toolReportTitle: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Email — blurb
                  <textarea
                    className="admin-textarea"
                    value={content.homePage.toolEmailBlurb}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, toolEmailBlurb: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Content — blurb
                  <textarea
                    className="admin-textarea"
                    value={content.homePage.toolContentBlurb}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, toolContentBlurb: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Report — blurb
                  <textarea
                    className="admin-textarea"
                    value={content.homePage.toolReportBlurb}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, toolReportBlurb: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              <h3 className="admin-h3" style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 600 }}>
                News + Articles
              </h3>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  News — section title
                  <input
                    className="admin-input"
                    value={content.homePage.newsLabel}
                    onChange={(e) =>
                      setContent({ ...content, homePage: { ...content.homePage, newsLabel: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  Articles — section title
                  <input
                    className="admin-input"
                    value={content.homePage.articlesLabel}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, articlesLabel: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  News — intro line
                  <textarea
                    className="admin-textarea"
                    value={content.homePage.newsLede}
                    onChange={(e) =>
                      setContent({ ...content, homePage: { ...content.homePage, newsLede: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Articles — intro line
                  <textarea
                    className="admin-textarea"
                    value={content.homePage.articlesLede}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, articlesLede: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label">
                  News — &quot;view all&quot; link text
                  <input
                    className="admin-input"
                    value={content.homePage.newsViewAll}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, newsViewAll: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="admin-label">
                  Articles — &quot;view all&quot; link text
                  <input
                    className="admin-input"
                    value={content.homePage.articlesViewAll}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        homePage: { ...content.homePage, articlesViewAll: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              <label className="admin-label">
                Ticker (one phrase per line)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 100 }}
                  value={content.homePage.tickerItems}
                  onChange={(e) =>
                    setContent({ ...content, homePage: { ...content.homePage, tickerItems: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          {tab === "teamPage" ? (
            <div className="admin-field-grid">
              <p className="admin-help" style={{ margin: "0 0 12px" }}>
                Public <Link href="/team">/team</Link> headline and the home page footer team strip. Add or remove
                people and photos under <Link href="/admin/team-members">Public team</Link> (no category filters on
                the site).
              </p>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Headline (first part)
                  <input
                    className="admin-input"
                    value={content.teamPage.meetHeadline}
                    onChange={(e) =>
                      setContent({ ...content, teamPage: { ...content.teamPage, meetHeadline: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  Headline (emphasized part)
                  <input
                    className="admin-input"
                    value={content.teamPage.meetHeadlineEmphasis}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        teamPage: { ...content.teamPage, meetHeadlineEmphasis: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              <h3 className="admin-h3" style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 600 }}>
                Footer (home) — team strip
              </h3>
              <label className="admin-label">
                Section title
                <input
                  className="admin-input"
                  value={content.teamPage.footerStripTitle}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      teamPage: { ...content.teamPage, footerStripTitle: e.target.value },
                    })
                  }
                />
              </label>
              <label className="admin-label">
                Link text
                <input
                  className="admin-input"
                  value={content.teamPage.footerStripCta}
                  onChange={(e) =>
                    setContent({ ...content, teamPage: { ...content.teamPage, footerStripCta: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Link path
                <input
                  className="admin-input"
                  value={content.teamPage.footerStripHref}
                  onChange={(e) =>
                    setContent({ ...content, teamPage: { ...content.teamPage, footerStripHref: e.target.value } })
                  }
                  placeholder="/team"
                />
              </label>
            </div>
          ) : null}

          {tab === "mission" ? (
            <div className="admin-field-grid">
              <label className="admin-label">
                Label
                <input
                  className="admin-input"
                  value={content.mission.label}
                  onChange={(e) =>
                    setContent({ ...content, mission: { ...content.mission, label: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Headline
                <textarea
                  className="admin-textarea"
                  value={content.mission.headline}
                  onChange={(e) =>
                    setContent({ ...content, mission: { ...content.mission, headline: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Body (blank line between paragraphs)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 140 }}
                  value={content.mission.body}
                  onChange={(e) =>
                    setContent({ ...content, mission: { ...content.mission, body: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          {tab === "brand" ? (
            <div className="admin-field-grid">
              <p className="admin-help" style={{ margin: "0 0 12px" }}>
                v4 brand blocks: &quot;What we offer&quot; through &quot;How we work&quot;. Use blank lines between
                paragraphs where noted.
              </p>
              <p className="admin-help" style={{ margin: "0 0 12px" }}>
                Small labels and section titles (shown in caps on the public site for each block):
              </p>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Offer block — label
                  <input
                    className="admin-input"
                    value={content.brand.offerLabel}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, offerLabel: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  How it works — label
                  <input
                    className="admin-input"
                    value={content.brand.howLabel}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, howLabel: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  Who this is for — label
                  <input
                    className="admin-input"
                    value={content.brand.whoLabel}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, whoLabel: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  What sets us apart — label
                  <input
                    className="admin-input"
                    value={content.brand.apartLabel}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, apartLabel: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  How we work — label
                  <input
                    className="admin-input"
                    value={content.brand.approachLabel}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, approachLabel: e.target.value } })
                    }
                  />
                </label>
              </div>
              <label className="admin-label">
                What we offer — block headline
                <textarea
                  className="admin-textarea"
                  value={content.brand.offerBlockHeadline}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      brand: { ...content.brand, offerBlockHeadline: e.target.value },
                    })
                  }
                />
              </label>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Offer: News
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 80 }}
                    value={content.brand.offerNews}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, offerNews: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  Offer: Articles
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 80 }}
                    value={content.brand.offerArticles}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, offerArticles: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Offer: Courses
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 80 }}
                    value={content.brand.offerCourses}
                    onChange={(e) =>
                      setContent({ ...content, brand: { ...content.brand, offerCourses: e.target.value } })
                    }
                  />
                </label>
              </div>
              <label className="admin-label">
                How it works (body)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 100 }}
                  value={content.brand.howBody}
                  onChange={(e) =>
                    setContent({ ...content, brand: { ...content.brand, howBody: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Who this is for (body)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 100 }}
                  value={content.brand.whoBody}
                  onChange={(e) =>
                    setContent({ ...content, brand: { ...content.brand, whoBody: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                What sets Xalura apart (body)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  value={content.brand.apartBody}
                  onChange={(e) =>
                    setContent({ ...content, brand: { ...content.brand, apartBody: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                How we work / approach (body; internal + positioning cross-over)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  value={content.brand.approachBody}
                  onChange={(e) =>
                    setContent({ ...content, brand: { ...content.brand, approachBody: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          {tab === "gearmedic" ? (
            <div className="admin-field-grid">
              <label className="admin-label">
                Label
                <input
                  className="admin-input"
                  value={content.gearmedic.label}
                  onChange={(e) =>
                    setContent({ ...content, gearmedic: { ...content.gearmedic, label: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Headline
                <textarea
                  className="admin-textarea"
                  value={content.gearmedic.headline}
                  onChange={(e) =>
                    setContent({ ...content, gearmedic: { ...content.gearmedic, headline: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Body
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  value={content.gearmedic.body}
                  onChange={(e) =>
                    setContent({ ...content, gearmedic: { ...content.gearmedic, body: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Body (second block)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 100 }}
                  value={content.gearmedic.body2}
                  onChange={(e) =>
                    setContent({ ...content, gearmedic: { ...content.gearmedic, body2: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Features (one per line; blank lines ignored)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 140 }}
                  value={featuresText}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setContent({
                      ...content,
                      gearmedic: { ...content.gearmedic, features: lines },
                    });
                  }}
                />
              </label>
              <div>
                <p className="admin-label" style={{ marginBottom: 10 }}>
                  Metrics
                </p>
                {content.gearmedic.metrics.map((m, i) => (
                  <div key={i} className="admin-metric-row">
                    <label className="admin-label">
                      Value
                      <input
                        className="admin-input"
                        value={m.value}
                        onChange={(e) => {
                          const metrics = [...content.gearmedic.metrics];
                          metrics[i] = { ...metrics[i], value: e.target.value };
                          setContent({ ...content, gearmedic: { ...content.gearmedic, metrics } });
                        }}
                      />
                    </label>
                    <label className="admin-label">
                      Label
                      <input
                        className="admin-input"
                        value={m.label}
                        onChange={(e) => {
                          const metrics = [...content.gearmedic.metrics];
                          metrics[i] = { ...metrics[i], label: e.target.value };
                          setContent({ ...content, gearmedic: { ...content.gearmedic, metrics } });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      style={{ marginBottom: 2 }}
                      onClick={() => {
                        const metrics = content.gearmedic.metrics.filter((_, j) => j !== i);
                        setContent({ ...content, gearmedic: { ...content.gearmedic, metrics } });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() =>
                    setContent({
                      ...content,
                      gearmedic: {
                        ...content.gearmedic,
                        metrics: [...content.gearmedic.metrics, { value: "", label: "" }],
                      },
                    })
                  }
                >
                  + Add metric
                </button>
              </div>
              <label className="admin-label">
                CTA label
                <input
                  className="admin-input"
                  value={content.gearmedic.cta}
                  onChange={(e) =>
                    setContent({ ...content, gearmedic: { ...content.gearmedic, cta: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          {tab === "footer" ? (
            <div className="admin-field-grid">
              <label className="admin-label">
                Tagline (line breaks allowed)
                <textarea
                  className="admin-textarea"
                  value={content.footer.tagline}
                  onChange={(e) =>
                    setContent({ ...content, footer: { ...content.footer, tagline: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          <p className="admin-help" style={{ marginTop: 24, marginBottom: 0 }}>
            Empty fields are allowed and will be saved as blank strings. Reload the public site after saving to
            see changes.
          </p>
        </>
      )}
    </div>
  );
}
