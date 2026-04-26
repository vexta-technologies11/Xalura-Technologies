"use client";

import Link from "next/link";
import { Mail, FileText, FileBarChart2 } from "lucide-react";
import type { PageContentMap } from "@/types/content";
import { HomeToolsTiltGrid } from "@/components/public/HomeToolsTiltGrid";

type Home = PageContentMap["homePage"];

function cardsFromCms(h: Home) {
  return [
    {
      href: "/ai-tools/email",
      label: h.toolEmailTitle,
      blurb: h.toolEmailBlurb,
      icon: Mail,
    },
    {
      href: "/ai-tools/content",
      label: h.toolContentTitle,
      blurb: h.toolContentBlurb,
      icon: FileText,
    },
    {
      href: "/ai-tools/report",
      label: h.toolReportTitle,
      blurb: h.toolReportBlurb,
      icon: FileBarChart2,
    },
  ] as const;
}

/**
 * Public homepage: tools teaser (glass, starfield). Copy from Page Content → Home: feed & tools.
 */
export function HomeAiToolsTeaser({ home }: { home: Home }) {
  const cards = cardsFromCms(home);
  return (
    <section
      id="ai-tools"
      className="home-ai home-ai--tight wrap"
      style={{ scrollMarginTop: 88 }}
    >
      <p className="label r home-ai__eyebrow" style={{ marginBottom: 4 }}>
        {home.everydayLabel}
      </p>
      <h2
        className="h2 r home-ai__title"
        style={{
          fontSize: "clamp(1.85rem, 3.2vw, 2.45rem)",
          maxWidth: 760,
          lineHeight: 1.2,
          marginTop: 0,
          marginBottom: 10,
        }}
      >
        {home.everydayHeadline}
      </h2>
      <p
        className="body-text home-ai__lede"
        style={{ maxWidth: 700, marginTop: 0, marginBottom: 24, opacity: 0.92, lineHeight: 1.55 }}
      >
        {home.everydaySubhead}{" "}
        <Link href={home.allToolsHref || "/ai-tools"} className="home-ai__all">
          {home.allToolsCta}
        </Link>
      </p>
      <HomeToolsTiltGrid
        cards={cards.map((c) => ({ href: c.href, label: c.label, blurb: c.blurb, icon: c.icon }))}
      />
    </section>
  );
}
