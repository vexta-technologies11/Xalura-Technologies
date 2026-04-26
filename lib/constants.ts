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
    label: "Xalura",
    headline: "The world is changing.\nBe the one who leads it.",
    subhead:
      "News, articles, and courses for professionals who want to understand what is coming and build the knowledge to stay ahead of it.",
    primaryCta: "Why we exist",
    secondaryCta: "What we offer",
    bentoHint:
      "Track what matters across AI and industry—news, deep dives, and courses in one place.",
  },
  mission: {
    label: "Why we exist",
    headline: "This is ours.",
    body: [
      "Every generation faces a moment when the rules of work and industry shift beneath their feet. This is ours.",
      "The tools reshaping how business gets done, how decisions get made, and how industries are organized are no longer on the horizon. They are already here. And the gap between those who understand them and those who do not is widening every year.",
      "Xalura was founded on a straightforward belief: that gap is not inevitable.",
      "We are a technology company that sits at the front edge of this shift. We build tools and platforms that make modern technology useful and accessible. And through our content, we give professionals, learners, and leaders the knowledge they need to move with confidence through a world that will not wait for anyone to catch up.",
    ].join("\n\n"),
  },
  brand: {
    offerLabel: "What we offer",
    offerBlockHeadline: "From daily signal to long-term skills—news, articles, and courses in one place.",
    offerNews:
      "We track what is changing across technology and industry and explain what it means in plain terms. The goal is not to inform you of events. It is to help you understand consequences.",
    offerArticles:
      "Honest, well-researched writing on the tools, strategies, and ideas defining the next era of work. Practical enough to use. Deep enough to matter.",
    offerCourses:
      "Structured learning built around real outcomes. Whether you are building a foundation or advancing an existing career, our courses are designed with one measure of success: are you more capable when you finish than when you started?",
    howLabel: "How it works",
    howBody: [
      "Xalura is built on systems that allow us to move quickly, stay current, and keep our content organized and accessible.",
      "But our value is not the technology behind the platform. It is the clarity we create for the people using it.",
    ].join("\n\n"),
    whoLabel: "Who this is for",
    whoBody: [
      "Professionals who want to lead their industry rather than react to it.",
      "Learners who take their development seriously and want their time to count.",
      "Anyone who recognizes that the shift already underway requires new knowledge and is ready to build it.",
    ].join("\n\n"),
    apartLabel: "What sets Xalura apart",
    apartBody: [
      "Most platforms give you information. We give you the context to do something with it.",
      "Xalura connects what is happening today to what it means for your work, your career, and your industry tomorrow. We were built by people who believe this kind of knowledge should not be the exclusive property of those already inside the room.",
      "Our standard is simple: everything we publish or teach should make you measurably more capable of leading in the world as it actually is, not as it was five years ago.",
    ].join("\n\n"),
    approachLabel: "How we work",
    approachBody: [
      "Xalura is a technology company building at the intersection of modern automation and human capability. Our platform and content exist to close the knowledge gap between where industries are heading and where most professionals currently stand. We do not chase trends. We track what is consequential, explain it clearly, and build the courses that turn understanding into competence.",
      "The message is never about technology for its own sake. It is always about what a person can do with the right knowledge: grounded, relevant, and fit for the world as it is now.",
    ].join("\n\n"),
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
  homePage: {
    everydayLabel: "Tools",
    everydayHeadline: "Everyday tools",
    everydaySubhead:
      "Professional-grade tools that work for you, every day—clear drafts, structured content, and printable reports when you need them.",
    toolEmailTitle: "Email generator",
    toolEmailBlurb: "Shape the message; get subject lines and a full draft you can send as-is.",
    toolContentTitle: "Content generator",
    toolContentBlurb: "Go from a topic to structured, web-ready copy with headings you can ship.",
    toolReportTitle: "Report builder",
    toolReportBlurb: "Turn rough notes into a clean report, then print or save as a PDF in one step.",
    allToolsCta: "All tools",
    allToolsHref: "/ai-tools",
    newsLabel: "News",
    newsLede: "Same-day reporting and analysis—what changed, and what it means for your work.",
    newsViewAll: "View all news",
    articlesLabel: "Articles",
    articlesLede: "Long-form guides and explainers on tools, strategy, and the next era of work.",
    articlesViewAll: "View all articles",
    tickerItems: [
      "Machine Learning",
      "Autonomous Systems",
      "Human-Centered AI",
      "Diagnostic Intelligence",
      "Autonomous Content",
      "Affiliate Intelligence",
    ].join("\n"),
  },
  teamPage: {
    meetHeadline: "Meet the",
    meetHeadlineEmphasis: "team.",
    footerStripTitle: "The Xalura team",
    footerStripCta: "Meet the full team",
    footerStripHref: "/team",
  },
  footer: {
    tagline: "The context to do something with it—news, articles, and courses for people who want to lead.",
  },
};
