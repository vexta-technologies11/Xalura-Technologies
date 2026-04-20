"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PAGE_CONTENT } from "@/lib/constants";

export function ContentEditor() {
  const [hero, setHero] = useState(DEFAULT_PAGE_CONTENT.hero);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("page_content")
      .select("content")
      .eq("section", "hero")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && typeof data.content === "object") {
          setHero({ ...DEFAULT_PAGE_CONTENT.hero, ...(data.content as object) });
        }
      });
  }, []);

  async function save() {
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("page_content").upsert(
      {
        section: "hero",
        content: hero,
      },
      { onConflict: "section" }
    );
    if (error) setStatus(error.message);
    else setStatus("Saved.");
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 24,
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Hero</h2>
      <label style={lbl}>
        Label
        <input
          style={inp}
          value={hero.label}
          onChange={(e) => setHero({ ...hero, label: e.target.value })}
        />
      </label>
      <label style={lbl}>
        Headline (use line breaks)
        <textarea
          style={{ ...inp, minHeight: 80 }}
          value={hero.headline}
          onChange={(e) => setHero({ ...hero, headline: e.target.value })}
        />
      </label>
      <label style={lbl}>
        Subhead
        <textarea
          style={{ ...inp, minHeight: 100 }}
          value={hero.subhead}
          onChange={(e) => setHero({ ...hero, subhead: e.target.value })}
        />
      </label>
      <label style={lbl}>
        Primary CTA
        <input
          style={inp}
          value={hero.primaryCta}
          onChange={(e) => setHero({ ...hero, primaryCta: e.target.value })}
        />
      </label>
      <label style={lbl}>
        Secondary CTA
        <input
          style={inp}
          value={hero.secondaryCta}
          onChange={(e) => setHero({ ...hero, secondaryCta: e.target.value })}
        />
      </label>
      {status ? <p style={{ fontSize: 13 }}>{status}</p> : null}
      <button
        type="button"
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          background: "#0a0a0a",
          color: "#fff",
          padding: "10px 18px",
          borderRadius: 100,
          border: "none",
          cursor: "pointer",
        }}
      >
        Save hero section
      </button>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
};

const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e5e5e5",
  fontSize: 14,
};
