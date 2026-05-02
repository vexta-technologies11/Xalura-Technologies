import type { Employee, EmployeeStat } from "@/types/employee";
import type { PageContentMap } from "@/types/content";

export const EMPLOYEE_STATS_BY_NAME: Record<string, EmployeeStat[]> = {};

export const DEFAULT_EMPLOYEES: Employee[] = [];

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
    headline: "Empowering professionals\nto stay ahead.",
    subhead:
      "News, articles, courses, and professional tools that help you understand what is changing and build the skills to lead through it.",
    primaryCta: "Why we exist",
    secondaryCta: "What we offer",
    bentoHint:
      "Track what matters across technology and industry. News, deep dives, tools, and courses in one place.",
  },
  mission: {
    label: "Why we exist",
    headline: "The world is shifting.\nYou should not have to catch up alone.",
    body: [
      "Every generation faces a moment when the rules of work change beneath their feet. This is ours.",
      "The tools reshaping how business gets done, how decisions are made, and how industries are organized are no longer coming. They are already here. And the gap between those who understand them and those who do not keeps getting wider every year.",
      "Xalura was built on a simple belief: that gap is not inevitable.",
      "We give you a single place to track what matters, understand what it means, and build the knowledge to move with confidence. News that explains consequences, not just events. Articles that are practical enough to use. Courses that leave you more capable than when you started. Professional tools that help you get things done every day, from email drafts to reports to presentations.",
      "You do not have to figure this out alone.",
    ].join("\n\n"),
  },
  brand: {
    offerLabel: "What we offer",
    offerBlockHeadline: "Everything you need to stay sharp: news, articles, courses, and tools in one place.",
    offerNews:
      "We track what is changing across technology and industry and explain what it means in plain language. Not just what happened, but why it matters for your work, your team, and your decisions.",
    offerArticles:
      "Honest, well-researched writing on the tools, strategies, and ideas shaping the next era of work. Practical enough to use tomorrow. Deep enough to change how you think.",
    offerCourses:
      "Structured learning with real outcomes. Whether you are building a foundation or advancing your career, our courses leave you measurably more capable than when you started.",
    howLabel: "How it works",
    howBody: [
      "Xalura brings together everything you need to stay ahead. News and articles keep you informed. Courses build your skills. Professional tools help you do the work, from writing emails to building presentations to analyzing data.",
      "You get one platform where the information, the learning, and the tools all connect.",
    ].join("\n\n"),
    whoLabel: "Who this is for",
    whoBody: [
      "Professionals who want to lead their field instead of reacting to it.",
      "Learners who take their development seriously and want their time to count.",
      "Anyone who sees that the world is changing fast and wants to be ready for it.",
      "If you have ever felt like you are falling behind while the industry moves ahead, this is for you.",
    ].join("\n\n"),
    apartLabel: "What makes Xalura different",
    apartBody: [
      "Most platforms give you information. We give you the full picture: what is happening, what it means, how to learn it, and the tools to apply it.",
      "Everything we publish and teach is built for one purpose: to make you more capable of leading in the world as it actually is, not as it was five years ago.",
    ].join("\n\n"),
    approachLabel: "Our approach",
    approachBody: [
      "We do not chase trends. We track what is consequential, explain it clearly, and build the tools and courses that turn understanding into action.",
      "The technology is never the point. The point is what a person can do with the right knowledge, at the right time, with the right tools in hand.",
    ].join("\n\n"),
  },
  gearmedic: {
    label: "Featured Product",
    headline: "GearMedic: know what is wrong\nbefore you walk into the shop.",
    body:
      "That check engine light turns on and your mind goes straight to the worst case. Is it a $10 sensor or a $2,000 repair? GearMedic gives you a straight answer. Enter your car, mileage, and fault code and get a clear diagnosis: what the problem likely is, what it means, and what part you probably need. No guessing. No upselling. Just the facts so you walk in informed.",
    body2:
      "GearMedic is built by the same team behind Xalura. The same approach of clarity and usefulness that drives everything we do.",
    features: [
      "Fault code and symptom-based diagnostic guidance",
      "Built using data patterns from Ford, Chevrolet, and others",
      "Parts matched to your diagnosis from real retailers",
      "Clear answers. No jargon. No upselling.",
    ],
    metrics: [
      { value: "70+", label: "articles in the GearMedic library" },
      { value: "Live", label: "fault-code intelligence refined daily" },
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
      "I kept running into the same limit: the tasks that have to happen every day, writing, research, publishing, and coordination, consume the hours that should go to strategy, growth, and craft. I founded Xalura to change that balance. My mission is to build systems that handle the recurring load so people can focus on what only they can decide and create.",
    bio2:
      "My vision is to give serious leverage to people who still do everything themselves. I want the clarity and continuity that large organizations take for granted to become available without the overhead. Xalura is young. We are building it to earn trust slowly and to open access responsibly.",
  },
  closing: {
    label: "Where we are going",
    headline: "We are just getting\nstarted.",
    body:
      "Xalura is early. GearMedic is the first product and there is a lot more planned. If you want a platform that helps you stay ahead, we would love to talk.",
    cta: "Start a Conversation",
  },
  homePage: {
    everydayLabel: "Tools",
    everydayHeadline: "Professional tools to help you get things done",
    everydaySubhead:
      "Draft emails, generate content, build reports, create presentations, translate text, analyze data, and more. Every tool is built to save you time and deliver results you can use immediately.",
    toolEmailTitle: "Email generator",
    toolEmailBlurb: "Describe what you need and get a full draft with subject lines ready to send.",
    toolContentTitle: "Content generator",
    toolContentBlurb: "Turn any topic into structured, web-ready copy with headings you can ship.",
    toolReportTitle: "Report builder",
    toolReportBlurb: "Turn rough notes into a clean, professional report ready to print or share.",
    allToolsCta: "See all tools",
    allToolsHref: "/ai-tools",
    newsLabel: "News",
    newsLede: "Same-day reporting and analysis on what is changing in technology and industry, and what it means for your work.",
    newsViewAll: "View all news",
    articlesLabel: "Articles",
    articlesLede: "Long-form guides and explainers on the tools, strategies, and ideas defining the next era of work.",
    articlesViewAll: "View all articles",
    tickerItems: [
      "Artificial Intelligence",
      "Machine Learning",
      "Automotive Tech",
      "Diagnostic Tools",
      "Content Strategy",
      "Industry Analysis",
      "Professional Development",
      "Tech Trends",
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
    tagline: "News, articles, courses, and tools for people who want to lead. Xalura helps you stay ahead.",
  },
};
