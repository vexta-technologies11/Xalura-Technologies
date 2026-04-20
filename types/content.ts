export type PageContentMap = {
  hero: {
    label: string;
    headline: string;
    subhead: string;
    primaryCta: string;
    secondaryCta: string;
  };
  mission: {
    label: string;
    headline: string;
    body: string;
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
