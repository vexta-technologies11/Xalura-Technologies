import type { Employee, EmployeeStat } from "@/types/employee";
import type { PageContentMap } from "@/types/content";

/** Fallback stats when DB row has no `stats` JSON (keyed by employee name) — career-style highlights */
export const EMPLOYEE_STATS_BY_NAME: Record<string, EmployeeStat[]> = {
  Mochi: [
    {
      value: "70+",
      label: "articles written and published for GearMedic from live trend intel",
    },
    {
      value: "Daily",
      label: "ship cadence — turns Kimmy's briefs into live explainers readers finish",
    },
  ],
  Kimmy: [
    {
      value: "Live",
      label: "real-time trend and demand research — what is hot and rising right now",
    },
    {
      value: "Signal → queue",
      label: "popular and latest topics routed straight into what Mochi writes next",
    },
  ],
  Maldita: [
    {
      value: "Daily",
      label: "site-wide SEO audit — deeplinking opportunities and crawl health",
    },
    {
      value: "On-page",
      label: "sentences and headings tuned to maximize SEO without sounding robotic",
    },
  ],
  Milka: [
    {
      value: "Full-stack",
      label: "visual systems — hero art, in-article media, thumbnails, and social-ready frames",
    },
    {
      value: "Brand-locked",
      label: "look and feel carried through every surface of GearMedic",
    },
  ],
};

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Mochi",
    role: "Author and Publisher",
    role_badge: "Author · Publisher",
    description:
      "Mochi writes and publishes GearMedic articles every day. She takes Kimmy's trend research on what is popular and rising, turns it into clear explainers, then edits and ships them live. She keeps the library growing and deadlines met whether you watch every draft or not.",
    icon_type: "writer",
    avatar_url: "/avatars/mochi.png",
    stats: EMPLOYEE_STATS_BY_NAME.Mochi,
    is_active: true,
    display_order: 1,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Maldita",
    role: "SEO Manager",
    role_badge: "SEO Manager",
    description:
      "Maldita audits the GearMedic site every day for SEO: where deeper internal links belong, which sentences and headings can rank better, and whether pages send the right signals to search. She finds deeplinking opportunities and reworks copy so the same traffic works harder — not keyword stuffing, just sharper on-page SEO.",
    icon_type: "seo",
    avatar_url: "/avatars/maldita.svg",
    stats: EMPLOYEE_STATS_BY_NAME.Maldita,
    is_active: true,
    display_order: 2,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Kimmy",
    role: "Researcher and Data Analyst",
    role_badge: "Data Analyst",
    description:
      "Kimmy runs real-time data and trend research — what people search for most, what is spiking, and what is next. She tracks the latest and most popular automotive topics and turns that into briefs so Mochi always knows what to write and publish while it still matters.",
    icon_type: "analyst",
    avatar_url: "/avatars/kimmy.png",
    stats: EMPLOYEE_STATS_BY_NAME.Kimmy,
    is_active: true,
    display_order: 3,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Milka",
    role: "Graphic Designer",
    role_badge: "Graphic Designer",
    description:
      "Milka handles everything visual. Thumbnails, banners, social graphics, layout ideas. She makes sure the content the team produces actually looks good when it reaches people.",
    icon_type: "designer",
    avatar_url: "/avatars/milka.png",
    stats: EMPLOYEE_STATS_BY_NAME.Milka,
    is_active: true,
    display_order: 4,
  },
];

export type PartnerRow = {
  id: string;
  name: string;
  logo_url: string | null;
  display_order: number;
  is_active: boolean;
};

export const DEFAULT_PARTNERS: PartnerRow[] = [
  { id: "1", name: "Amazon", logo_url: "/logos/amazon.svg", display_order: 1, is_active: true },
  { id: "2", name: "AutoZone", logo_url: "/logos/autozone.svg", display_order: 2, is_active: true },
  { id: "3", name: "eBay", logo_url: "/logos/ebay.svg", display_order: 3, is_active: true },
  { id: "4", name: "RockAuto", logo_url: "/logos/rockauto.svg", display_order: 4, is_active: true },
  {
    id: "5",
    name: "O'Reilly Auto",
    logo_url: "/logos/oreilly.svg",
    display_order: 5,
    is_active: true,
  },
  { id: "6", name: "Google", logo_url: "/logos/google.svg", display_order: 6, is_active: true },
  { id: "7", name: "Vercel", logo_url: "/logos/vercel.svg", display_order: 7, is_active: true },
];

export const DEFAULT_PAGE_CONTENT: PageContentMap = {
  hero: {
    label: "Xalura Technologies",
    headline: "AI that actually\nhelps you get\nthings done.",
    subhead:
      "Running a business is already a lot. You should not have to hire a full team just to keep up with content, research, and daily operations. Xalura builds AI systems that handle the repetitive, time-consuming work so you can focus on what actually moves the needle.",
    primaryCta: "Our Mission",
    secondaryCta: "Meet the Team",
  },
  mission: {
    label: "Why We Exist",
    headline: "There is too much to do\nand not enough hours.",
    body:
      "Most people running a business or a side project wear too many hats. Writing content, researching keywords, publishing articles, keeping up with SEO — it never ends. Hiring help costs money you may not have yet. Doing it yourself costs time you definitely do not have. Xalura exists because that frustration is real, and it has a real solution. We build AI systems that take those tasks off your plate and handle them properly, every single day.",
  },
  gearmedic: {
    label: "Featured Product",
    headline: "GearMedic: because the\nmechanic bill should not surprise you.",
    body:
      "Anyone who has ever seen a check engine light knows the feeling. You do not know if it is a ten dollar fix or a two thousand dollar one. You take it to a shop and hope for the best. GearMedic changes that. You enter your car, your mileage, and the fault code if you have it. The system gives you a straight answer. What the problem likely is, what it means, and what part you probably need.",
    body2:
      "Behind the scenes, Kimmy watches trends in real time, Mochi writes and publishes explainers from that intel, and Maldita audits the site daily for SEO, deeplinks, and sharper copy — so more people find answers before they step into a shop.",
    features: [
      "Fault code and symptom-based diagnostic guidance",
      "Built using data patterns from Ford, Chevrolet, and others",
      "Trend-led publishing — Kimmy surfaces demand, Mochi ships articles, Maldita tunes pages for SEO",
      "Parts matched to your diagnosis from real retailers",
      "Always-on publishing — new knowledge ships while you use the tool",
    ],
    metrics: [
      { value: "70+", label: "indexed articles in the GearMedic library" },
      { value: "Live", label: "fault-code intelligence refined as new patterns emerge" },
    ],
    cta: "Learn more",
  },
  founder: {
    label: "The Founder",
    name: "Jhon Louie Durano Cadullo",
    postnominal: "MBA",
    role: "Founder, Xalura Technologies",
    quote:
      "I started Xalura because the work that should stay in the background kept taking the foreground, and I believed that tension was not mine alone.",
    bio:
      "I keep running into the same limit: the tasks that must happen every day, writing, research, publishing, and coordination, consume the hours that should go to strategy, growth, and craft. I founded Xalura to change that balance. My mission is to build systems that shoulder the recurring load with discipline, so individuals and lean teams can return attention to what only they can decide and create.",
    bio2:
      "My vision is to extend serious operational leverage to people who still do everything themselves. I want the clarity, reliability, and continuity that large organizations assume to become available without pretense: systems that run without constant intervention, respect context, and make outcomes legible. Xalura is young; we are building it to earn trust slowly and to widen access responsibly.",
  },
  closing: {
    label: "Where We Are Going",
    headline: "We are just getting\nstarted.",
    body:
      "Xalura is early. GearMedic is the first product — Kimmy on trends, Mochi on writing and publishing, Maldita on site SEO, Milka on visuals — and there is a lot more planned. If you are tired of doing everything yourself and want to see what a small AI-powered team can do for your operation, we would love to talk.",
    cta: "Start a Conversation",
  },
  footer: {
    tagline: "Practical AI systems for\nreal-world operations.",
  },
};
