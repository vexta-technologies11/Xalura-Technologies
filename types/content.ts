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
  footer: {
    tagline: string;
  };
};
