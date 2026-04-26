export type PageContentMap = {
  hero: {
    label: string;
    headline: string;
    subhead: string;
    primaryCta: string;
    secondaryCta: string;
    /** Bento area hint (optional; below nav / above fold). */
    bentoHint?: string;
  };
  mission: {
    label: string;
    headline: string;
    body: string;
  };
  /** Brand v4+ positioning blocks (What we offer, how it works, etc.). */
  brand: {
    offerLabel: string;
    offerBlockHeadline: string;
    offerNews: string;
    offerArticles: string;
    offerCourses: string;
    howLabel: string;
    howBody: string;
    whoLabel: string;
    whoBody: string;
    apartLabel: string;
    apartBody: string;
    approachLabel: string;
    approachBody: string;
  };
  gearmedic: {
    label: string;
    headline: string;
    body: string;
    body2: string;
    features: string[];
    cta: string;
    /** Product-level KPI strip (e.g. articles live, drafts in queue) */
    metrics: { value: string; label: string }[];
  };
  founder: {
    label: string;
    name: string;
    /** Displayed beneath the name in minimal caps (e.g. MBA) */
    postnominal: string;
    role: string;
    quote: string;
    bio: string;
    bio2: string;
  };
  closing: {
    label: string;
    headline: string;
    body: string;
    cta: string;
  };
  /** Home: tools teaser, news/articles block copy, and ticker (editable in admin). */
  homePage: {
    /** Small label above the headline (e.g. “Everyday tools”) */
    everydayLabel: string;
    /** Main heading for the tools block */
    everydayHeadline: string;
    /** Subhead under the tools block */
    everydaySubhead: string;
    toolEmailTitle: string;
    toolEmailBlurb: string;
    toolContentTitle: string;
    toolContentBlurb: string;
    toolReportTitle: string;
    toolReportBlurb: string;
    allToolsCta: string;
    /** e.g. /ai-tools */
    allToolsHref: string;
    newsLabel: string;
    newsLede: string;
    newsViewAll: string;
    articlesLabel: string;
    articlesLede: string;
    articlesViewAll: string;
    /** Ticker: one item per line */
    tickerItems: string;
  };
  /** Team page: headline + footer strip (people from `team_members` table). */
  teamPage: {
    meetHeadline: string;
    meetHeadlineEmphasis: string;
    footerStripTitle: string;
    footerStripCta: string;
    /** e.g. /team */
    footerStripHref: string;
  };
  footer: {
    tagline: string;
  };
};
