"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PAGE_CONTENT } from "@/lib/constants";
import type { PageContentMap } from "@/types/content";

type TabId = keyof PageContentMap;

const TABS: { id: TabId; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "mission", label: "Mission" },
  { id: "gearmedic", label: "GearMedic" },
  { id: "founder", label: "Founder" },
  { id: "closing", label: "Closing" },
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
  const [tab, setTab] = useState<TabId>("hero");
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
        case "gearmedic":
          next.gearmedic = { ...next.gearmedic, ...partial } as PageContentMap["gearmedic"];
          break;
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
                Body
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

          {tab === "founder" ? (
            <div className="admin-field-grid">
              <label className="admin-label">
                Section label
                <input
                  className="admin-input"
                  value={content.founder.label}
                  onChange={(e) =>
                    setContent({ ...content, founder: { ...content.founder, label: e.target.value } })
                  }
                />
              </label>
              <div className="admin-field-grid admin-field-grid--2">
                <label className="admin-label">
                  Name
                  <input
                    className="admin-input"
                    value={content.founder.name}
                    onChange={(e) =>
                      setContent({ ...content, founder: { ...content.founder, name: e.target.value } })
                    }
                  />
                </label>
                <label className="admin-label">
                  Post-nominal
                  <input
                    className="admin-input"
                    value={content.founder.postnominal}
                    onChange={(e) =>
                      setContent({ ...content, founder: { ...content.founder, postnominal: e.target.value } })
                    }
                  />
                </label>
              </div>
              <label className="admin-label">
                Role
                <input
                  className="admin-input"
                  value={content.founder.role}
                  onChange={(e) =>
                    setContent({ ...content, founder: { ...content.founder, role: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Quote
                <textarea
                  className="admin-textarea"
                  value={content.founder.quote}
                  onChange={(e) =>
                    setContent({ ...content, founder: { ...content.founder, quote: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Bio
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  value={content.founder.bio}
                  onChange={(e) =>
                    setContent({ ...content, founder: { ...content.founder, bio: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Bio (second)
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  value={content.founder.bio2}
                  onChange={(e) =>
                    setContent({ ...content, founder: { ...content.founder, bio2: e.target.value } })
                  }
                />
              </label>
            </div>
          ) : null}

          {tab === "closing" ? (
            <div className="admin-field-grid">
              <label className="admin-label">
                Label
                <input
                  className="admin-input"
                  value={content.closing.label}
                  onChange={(e) =>
                    setContent({ ...content, closing: { ...content.closing, label: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Headline
                <textarea
                  className="admin-textarea"
                  value={content.closing.headline}
                  onChange={(e) =>
                    setContent({ ...content, closing: { ...content.closing, headline: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                Body
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  value={content.closing.body}
                  onChange={(e) =>
                    setContent({ ...content, closing: { ...content.closing, body: e.target.value } })
                  }
                />
              </label>
              <label className="admin-label">
                CTA
                <input
                  className="admin-input"
                  value={content.closing.cta}
                  onChange={(e) =>
                    setContent({ ...content, closing: { ...content.closing, cta: e.target.value } })
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
